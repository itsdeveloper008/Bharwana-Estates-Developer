"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCommissionRate } from "@/lib/format";
import { sumCommission, useMockStore } from "@/lib/mock-store";
import type { Developer, DeveloperOrigin } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "ALL" | "ADMIN" | "SELF_REGISTERED";

export default function AdminDevelopersPage() {
  const { properties, developers, transactions, updateDeveloper, deleteDeveloper } = useMockStore();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState("");

  const filtered = useMemo(() => {
    if (filter === "ALL") return developers;
    return developers.filter((developer) => developer.origin === filter);
  }, [developers, filter]);

  function startEdit(developer: Developer) {
    setEditingId(developer.id);
    setRateDraft((developer.commissionRate * 100).toFixed(1));
  }

  async function saveRate(developer: Developer) {
    const pct = Number.parseFloat(rateDraft);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast.error("Enter a rate between 0 and 100%");
      return;
    }
    await updateDeveloper(developer.id, { commissionRate: pct / 100 });
    toast.success(`Commission rate updated for ${developer.companyName} (future closes only).`);
    setEditingId(null);
  }

  async function approveDealer(developer: Developer) {
    await updateDeveloper(developer.id, { status: "ACTIVE" });
    toast.success(`${developer.companyName} approved.`);
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "ALL", label: "All" },
    { id: "ADMIN", label: "Admin-Added" },
    { id: "SELF_REGISTERED", label: "Self-Registered" },
  ];

  return (
    <div>
      <p className="type-eyebrow">Partners</p>
      <h1 className="mb-6 font-serif text-3xl">Dealers</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "border px-3 py-1.5 text-xs uppercase tracking-[0.14em] transition-colors",
              filter === item.id
                ? "border-gold bg-gold/15 text-forest"
                : "border-forest/15 text-forest/60 hover:border-forest/30",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((developer) => {
              const linked = properties.filter((property) => property.developerId === developer.id)
                .length;
              const pendingCommission = sumCommission(
                transactions.filter((tx) => tx.developerId === developer.id),
                ["PENDING", "INVOICED"],
              );
              const originLabel: Record<DeveloperOrigin, string> = {
                ADMIN: "Admin-added",
                SELF_REGISTERED: "Self-registered",
              };
              return (
                <TableRow key={developer.id}>
                  <TableCell className="font-medium">{developer.companyName}</TableCell>
                  <TableCell>
                    <div>{developer.contactPerson}</div>
                    {developer.registrationNumber ? (
                      <p className="text-xs text-muted-foreground">{developer.registrationNumber}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{originLabel[developer.origin]}</Badge>
                  </TableCell>
                  <TableCell>
                    {developer.status === "PENDING_REVIEW" ? (
                      <Badge variant="pending">Pending review</Badge>
                    ) : (
                      <Badge variant="verified">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === developer.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          className="h-8 w-20 bg-white text-right"
                          value={rateDraft}
                          onChange={(event) => setRateDraft(event.target.value)}
                          aria-label="Commission percent"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Button size="sm" type="button" onClick={() => void saveRate(developer)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          type="button"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-forest underline-offset-4 hover:underline"
                        onClick={() => startEdit(developer)}
                      >
                        {formatCommissionRate(developer.commissionRate)}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {developer.status === "PENDING_REVIEW" && (
                        <Button size="sm" type="button" onClick={() => void approveDealer(developer)}>
                          Approve Dealer
                        </Button>
                      )}
                      <ConfirmDeleteButton
                        label={developer.companyName}
                        description={
                          linked > 0 || pendingCommission > 0
                            ? `This dealer has ${linked} linked ${linked === 1 ? "property" : "properties"}${
                                pendingCommission > 0
                                  ? " and outstanding commission"
                                  : ""
                              }. Deleting may orphan listings. Are you sure?`
                            : "This cannot be undone."
                        }
                        onConfirm={async () => {
                          await deleteDeveloper(developer.id);
                          toast.success(`Deleted “${developer.companyName}”.`);
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No dealers in this view.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
