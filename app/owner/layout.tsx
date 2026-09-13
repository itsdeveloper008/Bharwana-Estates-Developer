import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="INDIVIDUAL">{children}</DashboardShell>;
}
