import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import posthog from "posthog-js";
import * as Sentry from "@sentry/react";
import { User } from "../types";
import apiClient, { setAccessToken, getAccessToken } from "../lib/apiClient";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isPro: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  verifyAndLogin: (token?: string, email?: string, otp?: string) => Promise<void>;
  fetchUserRecord: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isPro: false,
  isLoading: true,
  signOut: async () => {},
  refreshSession: async () => {},
  verifyAndLogin: async () => {},
  fetchUserRecord: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRecord = async () => {
    try {
      const res = await apiClient.get("/auth/jwt-me");
      const data = res.data;
      setUser(data.user);
      if (data.user) {
        posthog.identify(data.user.id, { email: data.user.email, plan: data.user.plan });
        Sentry.setUser({ id: data.user.id, email: data.user.email });
      }
    } catch (e) {
      
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const res = await apiClient.post("/auth/refresh");
      setAccessToken(res.data.accessToken);
      if (res.data.user) {
        setUser(res.data.user);
        posthog.identify(res.data.user.id, { email: res.data.user.email, plan: res.data.user.plan });
        Sentry.setUser({ id: res.data.user.id, email: res.data.user.email });
        setIsLoading(false);
      } else {
        await fetchUserRecord();
      }
    } catch (e) {
      setIsLoading(false);
    }
  };

  const verifyAndLogin = async (token?: string, email?: string, otp?: string) => {
    const payload = token ? { token } : { email, otp };
    const res = await apiClient.post("/auth/verify-email", payload);
    setAccessToken(res.data.accessToken);
    await fetchUserRecord();
  };

  useEffect(() => {
    // Check if we are coming from Google OAuth via hash fragment
    if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.replace('#', '?'));
      const token = params.get('access_token');
      if (token) {
        setAccessToken(token);
        // Clear fragment securely
        window.history.replaceState(null, '', window.location.pathname);
        fetchUserRecord();
        return;
      }
    }

    if (getAccessToken()) {
      fetchUserRecord();
    } else {
      refreshSession();
    }
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
      posthog.reset();
      Sentry.setUser(null);
    };

    const handleRefresh = ((e: CustomEvent) => {
      if (e.detail?.accessToken) {
        setAccessToken(e.detail.accessToken);
        fetchUserRecord();
      }
    }) as EventListener;

    window.addEventListener('auth:logout', handleLogout);
    window.addEventListener('auth:refresh', handleRefresh);

    return () => {
      window.removeEventListener('auth:logout', handleLogout);
      window.removeEventListener('auth:refresh', handleRefresh);
    };
  }, []);

  const signOut = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (e) {
      // Securely log the error without leaking stack traces or sensitive data
      console.error('An error occurred during this operation.');
    }
    setAccessToken(null);
    setUser(null);
    posthog.reset();
    Sentry.setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isPro: user?.plan && user.plan.toLowerCase() !== "free",
        isLoading,
        signOut,
        refreshSession,
        verifyAndLogin,
        fetchUserRecord,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
