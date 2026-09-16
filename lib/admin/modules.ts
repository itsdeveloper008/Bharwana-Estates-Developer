/** Admin panel module keys — match sidebar / route gates. */
export const ADMIN_MODULES = [
  "dashboard",
  "submissions",
  "properties",
  "dealers",
  "commissions",
  "inquiries",
  "newsletter",
  "team",
  "users",
  "deletion",
  "reports",
] as const;

export type AdminModule = (typeof ADMIN_MODULES)[number];

/** Super-Admin-only — never assignable to staff. */
export type AdminPanelRole = "super_admin" | "staff";

export const ADMIN_MODULE_LABELS: Record<AdminModule, string> = {
  dashboard: "Dashboard",
  submissions: "Submissions",
  properties: "Properties",
  dealers: "Dealers",
  commissions: "Commissions",
  inquiries: "Inquiries",
  newsletter: "Newsletter",
  team: "Team",
  users: "Users",
  deletion: "Deletion",
  reports: "Reports",
};

export const ALL_ADMIN_MODULES: AdminModule[] = [...ADMIN_MODULES];

export type AdminDoc = {
  role: AdminPanelRole;
  permissions: AdminModule[];
  fullName: string;
  email: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
};

export function isAdminModule(value: string): value is AdminModule {
  return (ADMIN_MODULES as readonly string[]).includes(value);
}

export function normalizePermissions(raw: unknown): AdminModule[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminModule[] = [];
  for (const item of raw) {
    if (typeof item === "string" && isAdminModule(item) && !out.includes(item)) {
      out.push(item);
    }
  }
  return out;
}
