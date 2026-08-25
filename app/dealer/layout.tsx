import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="DEALER">{children}</DashboardShell>;
}
