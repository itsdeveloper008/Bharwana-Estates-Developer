"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { AdminSearchInput } from "@/components/admin/admin-search-input";
import { DealerDetailModal } from "@/components/admin/dealer-detail-modal";
import { CommissionRateEditor } from "@/components/commission/commission-rate-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApiJson } from "@/lib/admin/admin-api";
import { useAdminAuth } from "@/lib/admin-auth";
import { useMarkAdminModuleViewed } from "@/lib/admin/use-mark-module-viewed";
import { buildDeveloperStatusChangePatch } from "@/lib/developer-status";
import { ensureSelfRegisteredDealer } from "@/lib/firestore/developers";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { useMockStore } from "@/lib/mock-store";
import { truncateText } from "@/lib/truncate";
import { displayUserEmail } from "@/lib/user-display";
import type { Developer, DeveloperOrigin } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "ALL" | "ADMIN" | "SELF_REGISTERED";

export default function AdminDevelopersPage() {
  useMarkAdminModuleViewed("dealers");
  const { admin, getIdToken } = useAdminAuth();
  const {
    properties,
    developers,
    users,
    usingFirestoreDevelopers,
    updateDeveloper,
    deleteDeveloper,
  } = useMockStore();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectPending, setRejectPending] = useState(false);

  /** Repair DEALER users that never got a Firestore developers/{id} doc. */
  useEffect(() => {
    if (!isFirebaseConfigured() || !usingFirestoreDevelopers) return;

    const missing = users.filter(
      (user) =>
        user.role === "DEALER" && !developers.some((developer) => developer.dealerUserId === user.id),
    );
    if (missing.length === 0) return;

    let cancelled = false;
    void (async () => {
      for (const user of missing) {
        if (cancelled) return;
        try {
          await ensureSelfRegisteredDealer({
            uid: user.id,
            companyName: user.agencyName?.trim() || user.fullName,
            contactPerson: user.fullName,
            registrationNumber: user.registrationNumber,
          });
        } catch (error) {
          console.error("[admin/developers] backfill failed", user.id, error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [users, developers, usingFirestoreDevelopers]);

  const filtered = useMemo(() => {
    const byOrigin =
      filter === "ALL" ? developers : developers.filter((developer) => developer.origin === filter);
    const q = query.trim().toLowerCase();
    if (!q) return byOrigin;
    return byOrigin.filter((developer) => {
      const linked = users.find((user) => user.id === developer.dealerUserId);
      const haystack = [
        developer.companyName,
        developer.contactPerson,
        developer.registrationNumber,
        linked?.fullName,
        displayUserEmail(linked?.email) ?? linked?.email,
        linked?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [developers, filter, query, users]);

  const selected = developers.find((developer) => developer.id === selectedId) ?? null;
  const selectedUser = selected?.dealerUserId
    ? users.find((user) => user.id === selected.dealerUserId)
    : undefined;
  const rejectTarget = developers.find((developer) => developer.id === rejectTargetId) ?? null;

  async function approveDealer(developer: Developer) {
    await updateDeveloper(
      developer.id,
      buildDeveloperStatusChangePatch(developer, {
        status: "ACTIVE",
        by: admin?.fullName ?? admin?.email ?? "Admin",
        clearRejectionReason: true,
      }),
    );
    toast.success(`${developer.companyName} approved.`);
  }

  function openReject(developer: Developer) {
    setRejectTargetId(developer.id);
    setRejectReason("");
    setRejectError(null);
    setRejectOpen(true);
  }

  async function rejectDealer() {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("Please provide a reason for rejection");
      return;
    }
    setRejectError(null);
    setRejectPending(true);
    try {
      await adminApiJson(getIdToken, `/api/admin/developers/${rejectTarget.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      toast.message("Dealer rejected");
      setRejectOpen(false);
      setRejectReason("");
      setRejectTargetId(null);
      if (selectedId === rejectTarget.id) setSelectedId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reject dealer.";
      toast.error(message);
    } finally {
      setRejectPending(false);
    }
  }

  function statusBadge(developer: Developer) {
    if (developer.status === "PENDING_REVIEW") {
      return <Badge variant="pending">Pending review</Badge>;
    }
    if (developer.status === "REJECTED") {
      return <Badge variant="rejected">Rejected</Badge>;
    }
    return <Badge variant="verified">Active</Badge>;
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

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={cn(
              "border px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] transition-colors",
              filter === item.id
                ? "border-gold bg-gold/15 text-forest"
                : "border-forest/15 text-forest/80 hover:border-forest/30 hover:text-forest",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <AdminSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by company, contact, email, phone…"
      />

      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Commission rate</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((developer) => {
              const linked = properties.filter((property) => property.developerId === developer.id)
                .length;
              const originLabel: Record<DeveloperOrigin, string> = {
                ADMIN: "Admin-added",
                SELF_REGISTERED: "Self-registered",
              };
              return (
                <TableRow
                  key={developer.id}
                  className="cursor-pointer hover:bg-forest/[0.04]"
                  onClick={() => setSelectedId(developer.id)}
                >
                  <TableCell
                    className="max-w-[14rem] truncate font-medium"
                    title={developer.companyName}
                  >
                    {truncateText(developer.companyName, 48)}
                  </TableCell>
                  <TableCell>
                    <div>{developer.contactPerson}</div>
                    {developer.registrationNumber ? (
                      <p className="text-xs text-muted-foreground">{developer.registrationNumber}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{originLabel[developer.origin]}</Badge>
                  </TableCell>
                  <TableCell>{statusBadge(developer)}</TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <CommissionRateEditor
                      compact
                      rate={developer.commissionRate}
                      onSave={async (nextRate) => {
                        await updateDeveloper(developer.id, { commissionRate: nextRate });
                      }}
                    />
                  </TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {(developer.status === "PENDING_REVIEW" ||
                        developer.status === "REJECTED") && (
                        <Button size="sm" type="button" onClick={() => void approveDealer(developer)}>
                          Approve Dealer
                        </Button>
                      )}
                      {developer.status === "PENDING_REVIEW" && (
                        <Button
                          size="sm"
                          variant="outline"
                          type="button"
                          onClick={() => openReject(developer)}
                        >
                          Reject
                        </Button>
                      )}
                      <ConfirmDeleteButton
                        label={developer.companyName}
                        description={
                          linked > 0
                            ? `This dealer has ${linked} linked ${linked === 1 ? "property" : "properties"}. Deleting removes the dealer profile and demotes their login so they cannot reappear. Are you sure?`
                            : "Deletes the dealer profile and demotes their login account. This cannot be undone."
                        }
                        onConfirm={async () => {
                          await deleteDeveloper(developer.id);
                          if (selectedId === developer.id) setSelectedId(null);
                          toast.success(`Deleted “${truncateText(developer.companyName, 48)}”.`);
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
                  {query.trim() ? "No dealers match this search." : "No dealers in this view."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DealerDetailModal
        developer={selected}
        linkedUser={selectedUser}
        linkedListings={
          selected
            ? properties.filter((property) => property.developerId === selected.id).length
            : 0
        }
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onSaveCommissionRate={async (nextRate) => {
          if (!selected) return;
          await updateDeveloper(selected.id, { commissionRate: nextRate });
        }}
      />

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) {
            setRejectTargetId(null);
            setRejectReason("");
            setRejectError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Reject dealer</DialogTitle>
            <DialogDescription className="break-all" title={rejectTarget?.companyName}>
              {rejectTarget
                ? `Provide a reason for rejecting ${truncateText(rejectTarget.companyName, 64)}. They will see it on their dealer desk${
                    selectedUser?.email ? " and receive an email if they have a real address on file" : ""
                  }.`
                : "Provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Reason for rejection"
            rows={4}
            className="bg-white"
          />
          {rejectError ? <p className="text-sm text-destructive">{rejectError}</p> : null}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={rejectPending} onClick={() => void rejectDealer()}>
              {rejectPending ? "Rejecting…" : "Reject dealer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
