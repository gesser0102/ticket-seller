import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SessionUserDto } from "@ticket-seller/shared";
import { ApiError, apiClient } from "../../lib/apiClient";

interface AuthContextValue {
  user: SessionUserDto | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUserDto>;
  logout: () => Promise<void>;
  completeRegistration: (user: SessionUserDto) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<SessionUserDto>("/auth/me")
      .then((sessionUser) => {
        if (!cancelled) setUser(sessionUser);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedUser = await apiClient.post<SessionUserDto>("/auth/login", { email, password });
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
    } finally {
      setUser(null);
    }
  }, []);

  const completeRegistration = useCallback((registeredUser: SessionUserDto) => {
    setUser(registeredUser);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, completeRegistration }),
    [user, loading, login, logout, completeRegistration],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth usado fora de AuthProvider");
  return ctx;
}
