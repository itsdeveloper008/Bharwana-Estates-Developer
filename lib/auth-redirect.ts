import type { UserRole } from "@/lib/types";

/** Honor an explicit returnTo, otherwise send returning users to a useful landing page. */
export function pathAfterAuth(returnTo: string | null | undefined, role?: UserRole | string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  switch (role) {
    case "HOUSE_OWNER":
      return "/owner/add-property";
    case "DEALER":
      return "/dealer/add-property";
    case "BUYER":
      return "/properties";
    case "SALES_REP":
      return "/sales";
    case "ADMIN":
      return "/admin/dashboard";
    default:
      return "/";
  }
}
