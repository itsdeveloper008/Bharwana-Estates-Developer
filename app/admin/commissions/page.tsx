"use client";

import { useMemo, useState } from "react";
import { Percent } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  commissionStatusLabel,
  formatCommissionRate,
  formatDate,
  formatPriceFull,
} from "@/lib/format";
import { sumCommission, useMockStore } from "@/lib/mock-store";
import type { CommissionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function commissionBadgeClass(status: CommissionStatus) {
  if (status === "PENDING") return "border-amber-600/30 bg-amber-50 text-amber-900";
  if (status === "INVOICED") return "border-sky-700/25 bg-sky-50 text-sky-900";
  return "border-emerald-700/25 bg-emerald-50 text-emerald-900";
}

export default function AdminCommissionsPage() {
  const { properties, developers, transactions, updateTransaction } = useMockStore();
  const [dealerFilter, setDealerFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | "ALL">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (dealerFilter !== "ALL" && tx.developerId !== dealerFilter) return false;
        if (statusFilter !== "ALL" && tx.commissionStatus !== statusFilter) return false;
        if (fromDate && tx.closedAt.slice(0, 10) < fromDate) return false;
        if (toDate && tx.closedAt.slice(0, 10) > toDate) return false;
        return true;
      })
      .sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  }, [transactions, dealerFilter, statusFilter, fromDate, toDate]);

  const totalAll = sumCommission(transactions);
  const outstanding = sumCommission(transactions, ["PENDING", "INVOICED"]);
  const paid = sumCommission(transactions, ["PAID"]);

  async function setStatus(id: string, commissionStatus: CommissionStatus) {
    await updateTransaction(id, { commissionStatus });
    toast.success(`Marked as ${commissionStatusLabel(commissionStatus)}.`);
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Finance</p>
      <h1 className="mb-8 font-serif text-3xl">Commission report</h1>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="border border-forest/10 bg-white p-5">
          <Percent className="h-5 w-5 text-gold" />
          <p className="mt-4 font-serif text-2xl text-forest">{formatPriceFull(totalAll)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Total commission
          </p>
        </div>
        <div className="border border-forest/10 bg-white p-5">
          <p className="font-serif text-2xl text-amber-900">{formatPriceFull(outstanding)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Outstanding
          </p>
        </div>
        <div className="border border-forest/10 bg-white p-5">
          <p className="font-serif text-2xl text-emerald-900">{formatPriceFull(paid)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Paid</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Dealer</p>
          <Select value={dealerFilter} onValueChange={setDealerFilter}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All dealers</SelectItem>
              {developers.map((developer) => (
                <SelectItem key={developer.id} value={developer.id}>
                  {developer.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Status</p>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as CommissionStatus | "ALL")}
          >
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="INVOICED">Invoiced</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">From</p>
          <Input
            type="date"
            className="w-[160px] bg-white"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">To</p>
          <Input
            type="date"
            className="w-[160px] bg-white"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dealer</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Final price</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead className="w-48" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((tx) => {
              const developer = developers.find((item) => item.id === tx.developerId);
              const property = properties.find((item) => item.id === tx.propertyId);
              return (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {developer?.companyName ?? tx.developerId}
                  </TableCell>
                  <TableCell>{property?.title ?? tx.propertyId}</TableCell>
                  <TableCell>{formatPriceFull(tx.finalPrice)}</TableCell>
                  <TableCell>{formatCommissionRate(tx.commissionRate)}</TableCell>
                  <TableCell>{formatPriceFull(tx.commissionAmount)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                        commissionBadgeClass(tx.commissionStatus),
                      )}
                    >
                      {commissionStatusLabel(tx.commissionStatus)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(tx.closedAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {tx.commissionStatus === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => void setStatus(tx.id, "INVOICED")}
                        >
                          Mark invoiced
                        </Button>
                      )}
                      {(tx.commissionStatus === "PENDING" ||
                        tx.commissionStatus === "INVOICED") && (
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => void setStatus(tx.id, "PAID")}
                        >
                          Mark paid
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No transactions match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
