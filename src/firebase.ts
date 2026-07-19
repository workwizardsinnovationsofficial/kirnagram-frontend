type AuthUser = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
};

type StoredUser = {
  user_id: string;
  public_id?: string;
  full_name?: string;
  email?: string;
  mobile?: string;
  photoURL?: string | null;
};

type AuthListener = (user: AuthUser | null) => void;

declare global {
  interface GooglePromptNotification {
    isNotDisplayed?: () => boolean;
    isSkippedMoment?: () => boolean;
    isDismissedMoment?: () => boolean;
    isDisplayMoment?: () => boolean;
    isGranted?: () => boolean;
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (callback: (notification: GooglePromptNotification) => void) => void;
          renderButton?: (container: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

let currentUser: AuthUser | null = null;
const listeners = new Set<AuthListener>();

const buildAuthUser = (user: StoredUser | null, accessToken: string | null): AuthUser | null => {
  if (!user || !accessToken) return null;

  return {
    uid: user.user_id,
    email: user.email ?? null,
    displayName: user.full_name ?? null,
    photoURL: user.photoURL ?? null,
    getIdToken: async () => accessToken,
  };
};

const emitAuthState = (user: AuthUser | null) => {
  listeners.forEach((listener) => listener(user));
};

export const auth = {
  get currentUser() {
    return currentUser;
  },
  set currentUser(value: AuthUser | null) {
    currentUser = value;
    emitAuthState(value);
  },
  onAuthStateChanged(callback: AuthListener): () => void {
    listeners.add(callback);
    callback(currentUser);
    return () => {
      listeners.delete(callback);
    };
  },
  signOut: async (): Promise<void> => {
    clearAuthSession();
  },
};

export const googleProvider = { name: "google" };

export const setAuthSession = (accessToken: string, refreshToken: string, user: StoredUser) => {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("user_id", user.user_id);

  currentUser = buildAuthUser(user, accessToken);
  emitAuthState(currentUser);
  return currentUser;
};

export const clearAuthSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  localStorage.removeItem("user_id");

  currentUser = null;
  emitAuthState(null);
};

const hydrateAuthFromStorage = () => {
  if (typeof window === "undefined") return;

  const accessToken = localStorage.getItem("access_token");
  const storedUser = localStorage.getItem("user");
  const storedUserId = localStorage.getItem("user_id");

  if (!accessToken) {
    currentUser = null;
    return;
  }

  try {
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser) as StoredUser;
      currentUser = buildAuthUser(parsedUser, accessToken);
    } else if (storedUserId) {
      currentUser = buildAuthUser({ user_id: storedUserId }, accessToken);
    } else {
      currentUser = null;
    }
  } catch {
    currentUser = null;
  }
};

hydrateAuthFromStorage();

const API_BASE = "https://api.kirnagram.com";

const decodeJwtPayload = (token: string) => {
  const segments = token.split(".");
  const payload = segments[1] || "";
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const decoded = atob(padded);
  return JSON.parse(decodeURIComponent(decoded.split("").map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`).join("")));
};

const loadGoogleScript = () => {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google auth is only available in the browser"));
      return;
    }

    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById("google-gsi-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google auth script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google auth script"));
    document.head.appendChild(script);
  });
};

export const signInWithEmailAndPassword = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      login_type: "email_password",
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || "Login failed");
  }

  const authUser = setAuthSession(data.access_token, data.refresh_token, {
    user_id: data.user_id,
    public_id: data.public_id,
    full_name: data.full_name,
    email,
  });

  return { user: authUser, data };
};

export const createUserWithEmailAndPassword = async (email: string, password: string, fullName: string) => {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: fullName,
      email,
      password,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || "Signup failed");
  }

  const authUser = setAuthSession(data.access_token, data.refresh_token, {
    user_id: data.user_id,
    public_id: data.public_id,
    full_name: fullName,
    email,
  });

  return { user: authUser, data };
};

export const getGoogleAuthProfile = async () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
  if (!clientId) {
    throw new Error("Google OAuth is not configured. Set VITE_GOOGLE_CLIENT_ID.");
  }

  await loadGoogleScript();

  return new Promise<{ idToken: string; profile: any }>((resolve, reject) => {
    if (!window.google?.accounts?.id) {
      reject(new Error("Google auth is unavailable"));
      return;
    }

    let timeoutId: NodeJS.Timeout | undefined;
    let resolved = false;

    const handleResponse = (googleResponse: { credential?: string }) => {
      if (resolved) return;
      resolved = true;

      if (timeoutId) clearTimeout(timeoutId);

      if (!googleResponse.credential) {
        reject(new Error("Google sign-in did not return a credential"));
        return;
      }

      try {
        const payload = decodeJwtPayload(googleResponse.credential);

        resolve({
          idToken: googleResponse.credential,
          profile: {
            name: payload.name || payload.given_name || "",
            email: payload.email || "",
            picture: payload.picture || "",
            dob: payload.birthdate || null,
            gender: payload.gender || null,
            given_name: payload.given_name || "",
            family_name: payload.family_name || "",
          },
        });
      } catch (err) {
        reject(new Error(`Failed to decode Google token: ${err instanceof Error ? err.message : String(err)}`));
      }
    };

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleResponse,
      auto_select: false,
      cancel_on_tap_outside: false,
    });

    // Show Google One Tap UI if available.
    // The page already provides its own Google button, so we avoid rendering a duplicate fallback button.
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        return;
      }
    });

    // Timeout as safety net
    timeoutId = setTimeout(() => {
      if (!resolved) {
        reject(new Error("Google sign-in timeout"));
      }
    }, 35000);
  });
};

export const signInWithGoogle = async () => {
  const { idToken, profile } = await getGoogleAuthProfile();

  const backendResponse = await fetch(`${API_BASE}/auth/google-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_token: idToken,
      full_name: profile.name,
      email: profile.email,
      image_name: profile.picture,
      dob: profile.dob,
      gender: profile.gender,
    }),
  });

  const data = await backendResponse.json().catch(() => ({}));
  if (!backendResponse.ok) {
    throw new Error(data?.detail || "Google login failed");
  }

  const authUser = setAuthSession(data.access_token, data.refresh_token, {
    user_id: data.user_id,
    public_id: data.public_id,
    full_name: data.full_name,
    email: profile.email || "",
    photoURL: profile.picture || null,
  });

  return { user: authUser, data };
};
