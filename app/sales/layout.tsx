import { DashboardShell } from "@/components/layout/dashboard-shell";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell role="SALES_REP">{children}</DashboardShell>;
}
