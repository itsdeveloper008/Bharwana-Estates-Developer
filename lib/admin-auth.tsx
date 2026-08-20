"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authenticateAdmin,
  type AdminSession,
} from "@/lib/mock-data/admin-users";
import { delay } from "@/lib/utils";

const STORAGE_KEY = "bharwana_admin_session";

interface AdminAuthContextValue {
  admin: AdminSession | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AdminSession;
        if (parsed?.email && parsed?.role === "ADMIN") {
          setAdmin(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsReady(true);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // TODO: replace with real backend call
    await delay(700);
    const session = authenticateAdmin(email, password);
    if (!session) {
      return { ok: false as const, error: "Invalid email or password" };
    }
    setAdmin(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { ok: true as const };
  }, []);

  const logout = useCallback(() => {
    // TODO: replace with real backend call
    setAdmin(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated: Boolean(admin),
      isReady,
      login,
      logout,
    }),
    [admin, isReady, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
