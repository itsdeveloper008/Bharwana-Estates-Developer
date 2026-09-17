import type { UserRole } from "@/lib/types";
import { isIndividualRole } from "@/lib/user-role";

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

/** Navbar / CTA destination for "List your property". */
export function listPropertyHrefFor(role?: UserRole | string | null): string {
  if (role === "DEALER") return "/dealer/add-property";
  if (isIndividualRole(role)) return "/owner/add-property";
  return `/login?returnTo=${encodeURIComponent("/owner/add-property")}`;
}
