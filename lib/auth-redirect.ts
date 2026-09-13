import type { UserRole } from "@/lib/types";

/**
 * After sign-in or sign-up: honor an explicit safe returnTo, otherwise go to the landing page.
 * (Admin / sales keep their desks when no returnTo is set.)
 */
export function pathAfterAuth(returnTo: string | null | undefined, role?: UserRole | string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "SALES_REP") return "/sales";
  return "/";
}
