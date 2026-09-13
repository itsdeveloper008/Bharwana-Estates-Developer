import type { UserRole } from "@/lib/types";
import { isIndividualRole } from "@/lib/user-role";

/** Honor an explicit returnTo, otherwise send returning users to a useful landing page. */
export function pathAfterAuth(returnTo: string | null | undefined, role?: UserRole | string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  if (isIndividualRole(role)) {
    return "/properties";
  }
  switch (role) {
    case "DEALER":
      return "/dealer/add-property";
    case "SALES_REP":
      return "/sales";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/";
  }
}
