"use client";

/**
 * Firebase-free admin auth context + hook for the public navbar.
 */
import { createContext, useContext } from "react";
import type { AdminModule, AdminPanelRole } from "@/lib/admin/modules";

export interface AdminSession {
  uid: string;
  email: string;
  fullName: string;
  role: "ADMIN";
  adminRole: AdminPanelRole;
  permissions: AdminModule[];
  avatarUrl?: string;
}

export interface AdminAuthContextValue {
  admin: AdminSession | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isSuperAdmin: boolean;
  hasModule: (module: AdminModule) => boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export const BOOTSTRAP_ADMIN: AdminAuthContextValue = {
  admin: null,
  isAuthenticated: false,
  isReady: false,
  isSuperAdmin: false,
  hasModule: () => false,
  login: async () => ({ ok: false, error: "App is still loading." }),
  logout: () => undefined,
  refreshSession: async () => undefined,
  getIdToken: async () => null,
};

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  return context ?? BOOTSTRAP_ADMIN;
}
