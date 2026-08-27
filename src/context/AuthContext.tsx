import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  user_id: string;
  public_id: string;
  full_name: string;
  email?: string;
  mobile?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const storedAccessToken = localStorage.getItem("access_token");
    const storedRefreshToken = localStorage.getItem("refresh_token");
    const storedUser = localStorage.getItem("user");

    if (storedAccessToken && storedRefreshToken) {
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (err) {
          console.error("Failed to parse stored user:", err);
        }
      }
    }

    setIsLoading(false);
  }, []);

  const login = (accessToken: string, refreshToken: string, user: User) => {
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setUser(user);

    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("user_id", user.user_id);
  };

  const logout = () => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);

    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("user_id");
  };

  const refreshAccessToken = async (): Promise<boolean> => {
    if (!refreshToken) {
      logout();
      return false;
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/refresh-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        logout();
        return false;
      }

      const data = await response.json();

      if (data.access_token) {
        setAccessToken(data.access_token);
        localStorage.setItem("access_token", data.access_token);
        return true;
      }

      logout();
      return false;
    } catch (err) {
      console.error("Token refresh failed:", err);
      logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!accessToken && !!user,
        isLoading,
        login,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
