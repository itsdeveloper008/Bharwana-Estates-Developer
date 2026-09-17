"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadReportPdf } from "@/lib/admin/report-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMockStore } from "@/lib/mock-store";
import { formatUserRole } from "@/lib/user-role";

type ReportCategory = "listings" | "dealers" | "leads" | "users";

function parseDayStart(isoDate: string): number | null {
  if (!isoDate) return null;
  const t = Date.parse(`${isoDate}T00:00:00`);
  return Number.isFinite(t) ? t : null;
}

function parseDayEnd(isoDate: string): number | null {
  if (!isoDate) return null;
  const t = Date.parse(`${isoDate}T23:59:59.999`);
  return Number.isFinite(t) ? t : null;
}

function inRange(iso: string | undefined, fromMs: number | null, toMs: number | null): boolean {
  if (!iso) return fromMs == null && toMs == null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  if (fromMs != null && t < fromMs) return false;
  if (toMs != null && t > toMs) return false;
  return true;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AdminReportsPage() {
  const { properties, developers, inquiries, users } = useMockStore();
  const [category, setCategory] = useState<ReportCategory>("listings");
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [pending, setPending] = useState(false);

  const fromMs = useMemo(() => parseDayStart(from), [from]);
  const toMs = useMemo(() => parseDayEnd(to), [to]);

  function buildTable() {
    const rangeLabel = `${from || "…"} → ${to || "…"}`;

    if (category === "listings") {
      const rows = properties
        .filter((p) => inRange(p.createdAt, fromMs, toMs))
        .map((p) => [
          p.id,
          p.title || "-",
          p.status,
          p.city || "-",
          p.ownerUserId || "-",
          p.createdAt?.slice(0, 10) || "-",
        ]);
      return {
        title: "Listings report",
        subtitle: `Bharwana Estates · ${rangeLabel} · ${rows.length} rows`,
        columns: ["ID", "Title", "Status", "City", "Owner", "Created"],
        rows,
        filename: `listings-${from || "all"}-${to || "all"}.pdf`,
      };
    }

    if (category === "dealers") {
      const rows = developers
        .filter((d) => inRange(d.createdAt, fromMs, toMs))
        .map((d) => [
          d.id,
          d.companyName || "-",
          d.status,
          d.contactPerson || "-",
          d.dealerUserId || "-",
          d.createdAt?.slice(0, 10) || "-",
        ]);
      return {
        title: "Dealers report",
        subtitle: `Bharwana Estates · ${rangeLabel} · ${rows.length} rows`,
        columns: ["ID", "Company", "Status", "Contact", "User ID", "Created"],
        rows,
        filename: `dealers-${from || "all"}-${to || "all"}.pdf`,
      };
    }

    if (category === "leads") {
      const rows = inquiries
        .filter((i) => inRange(i.createdAt, fromMs, toMs))
        .map((i) => [
          i.id,
          i.status,
          i.channel,
          i.propertyId || "-",
          i.buyerId || "-",
          i.createdAt?.slice(0, 10) || "-",
        ]);
      return {
        title: "Leads / Inquiries report",
        subtitle: `Bharwana Estates · ${rangeLabel} · ${rows.length} rows`,
        columns: ["ID", "Status", "Channel", "Property", "Buyer ID", "Created"],
        rows,
        filename: `leads-${from || "all"}-${to || "all"}.pdf`,
      };
    }

    // users - no createdAt on User type reliably; use whatever we have or include all in range as "all"
    const rows = users
      .filter((u) => {
        const created = (u as { createdAt?: string }).createdAt;
        if (!created) return true;
        return inRange(created, fromMs, toMs);
      })
      .map((u) => [
        u.id,
        u.fullName || "-",
        u.email || "-",
        formatUserRole(u.role),
        u.phone || "-",
        (u as { createdAt?: string }).createdAt?.slice(0, 10) || "-",
      ]);
    return {
      title: "Users (signups) report",
      subtitle: `Bharwana Estates · ${rangeLabel} · ${rows.length} rows`,
      columns: ["ID", "Name", "Email", "Role", "Phone", "Created"],
      rows,
      filename: `users-${from || "all"}-${to || "all"}.pdf`,
    };
  }

  async function handleDownload() {
    if (from && to && fromMs != null && toMs != null && fromMs > toMs) {
      toast.error("“From” date must be on or before “To” date.");
      return;
    }
    setPending(true);
    try {
      const table = buildTable();
      if (table.rows.length === 0) {
        toast.message("No data found for this range");
        return;
      }
      downloadReportPdf(table, table.filename);
      toast.success("PDF downloaded.");
    } catch (error) {
      console.error("[reports] pdf failed", error);
      toast.error("Could not generate PDF. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="type-eyebrow">Analytics</p>
        <h1 className="font-serif text-3xl text-forest">Reports</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Download PDF summaries by category and date range. Sales and Commissions will appear here
          once deal transactions are stored in Firestore.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-forest/10 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
            <SelectTrigger className="bg-ivory">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="listings">Listings (Properties)</SelectItem>
              <SelectItem value="dealers">Dealers</SelectItem>
              <SelectItem value="leads">Leads / Inquiries</SelectItem>
              <SelectItem value="users">Users (signups)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-from">From</Label>
          <Input
            id="report-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-ivory"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-to">To</Label>
          <Input
            id="report-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-ivory"
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full rounded-xl" disabled={pending} onClick={() => void handleDownload()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
