"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { users } from "@/lib/mock-data/users";
import type { User, UserRole } from "@/lib/types";

interface MockAuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loginAs: (user: User) => void;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
}

const MockAuthContext = createContext<MockAuthContextValue | undefined>(undefined);

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const loginAs = useCallback((next: User) => {
    // TODO: replace with real backend call
    setUser(next);
  }, []);

  const loginAsRole = useCallback((role: UserRole) => {
    // TODO: replace with real backend call
    const match = users.find((item) => item.role === role);
    if (match) setUser(match);
  }, []);

  const logout = useCallback(() => {
    // TODO: replace with real backend call
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loginAs,
      loginAsRole,
      logout,
    }),
    [user, loginAs, loginAsRole, logout],
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error("useMockAuth must be used within MockAuthProvider");
  }
  return context;
}
