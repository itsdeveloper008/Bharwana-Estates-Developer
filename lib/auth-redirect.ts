import type { UserRole } from "@/lib/types";

/** Honor an explicit returnTo, otherwise send the user to their role portal. */
export function pathAfterAuth(returnTo: string | null | undefined, role?: UserRole | string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  switch (role) {
    case "HOUSE_OWNER":
      return "/owner";
    case "DEALER":
      return "/dealer";
    case "BUYER":
      return "/saved";
    case "SALES_REP":
      return "/sales";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/";
  }
}
