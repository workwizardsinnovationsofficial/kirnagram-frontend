import { auth } from "@/firebase";

/**
 * Get JWT access token for API requests
 * Tries localStorage first (new JWT auth system), falls back to Firebase
 * Returns null if no token is available
 */
export async function getAuthToken(): Promise<string | null> {
  // Try to get JWT token from localStorage (new auth system)
  const jwtToken = localStorage.getItem("access_token");
  if (jwtToken) {
    return jwtToken;
  }

  // Fallback to Firebase token for backward compatibility
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    try {
      return await firebaseUser.getIdToken();
    } catch (error) {
      console.error("Failed to get Firebase ID token:", error);
    }
  }

  return null;
}

/**
 * Get current user ID
 * Tries localStorage first (new JWT auth system), falls back to Firebase
 * Returns null if no user is available
 */
export function getUserId(): string | null {
  // Try to get user_id from localStorage (new auth system)
  const userId = localStorage.getItem("user_id");
  if (userId) {
    return userId;
  }

  // Fallback to Firebase user ID
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    return firebaseUser.uid;
  }

  return null;
}
