import type { UserRole } from "@/lib/types";

/** Browse, inquire, save, and list personal properties (legacy BUYER / HOUSE_OWNER included). */
export function isIndividualRole(role: string | null | undefined): boolean {
  return role === "INDIVIDUAL" || role === "BUYER" || role === "HOUSE_OWNER";
}

/** Human label for badges and account UI. */
export function formatUserRole(role: string | null | undefined): string {
  if (!role) return "—";
  if (isIndividualRole(role)) return "Individual";
  if (role === "DEALER") return "Dealer";
  if (role === "SALES_REP") return "Sales rep";
  if (role === "ADMIN") return "Admin";
  return role.replaceAll("_", " ");
}

/**
 * Map Firestore role → app role. Legacy BUYER / HOUSE_OWNER become INDIVIDUAL
 * so permission checks stay consistent before and after migration.
 */
export function normalizeStoredRole(role: unknown): UserRole {
  const raw = String(role ?? "INDIVIDUAL");
  if (raw === "BUYER" || raw === "HOUSE_OWNER" || raw === "INDIVIDUAL") return "INDIVIDUAL";
  if (raw === "DEALER" || raw === "SALES_REP" || raw === "ADMIN") return raw;
  return "INDIVIDUAL";
}
