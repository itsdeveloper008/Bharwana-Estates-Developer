"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminSearchInput } from "@/components/admin/admin-search-input";
import {
  AdminPageHeader,
  AdminTableShell,
  adminEmptyCellClass,
  adminTabClass,
  adminTableHeadClass,
} from "@/components/admin/admin-ui";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { SubmissionDetailModal } from "@/components/admin/submission-detail-modal";
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
import { formatDate, formatPrice, listingBadge, statusLabel } from "@/lib/format";
import { adminApiJson } from "@/lib/admin/admin-api";
import { useMockStore } from "@/lib/mock-store";
import { buildStatusChangePatch } from "@/lib/property-status";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useAdminAuth } from "@/lib/admin-auth";
import { useMarkAdminModuleViewed } from "@/lib/admin/use-mark-module-viewed";

type Tab = "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED" | "ALL";

const TABS: { id: Tab; label: string }[] = [
  { id: "PENDING_APPROVAL", label: "Pending" },
  { id: "PUBLISHED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "ALL", label: "All" },
];

export default function AdminSubmissionsPage() {
  const { admin, getIdToken } = useAdminAuth();
  useMarkAdminModuleViewed("submissions");
  const { properties, developers, users, updateProperty, deleteProperty } = useMockStore();
  const [tab, setTab] = useState<Tab>("PENDING_APPROVAL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectPending, setRejectPending] = useState(false);

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const filtered = useMemo(() => {
    const list =
      tab === "ALL"
        ? properties.filter((property) =>
            ["PENDING_APPROVAL", "PUBLISHED", "REJECTED"].includes(property.status),
          )
        : properties.filter((property) => property.status === tab);

    const q = query.trim().toLowerCase();
    const searched = !q
      ? list
      : list.filter((property) => {
          const owner = userById.get(property.ownerUserId ?? "");
          const haystack = [
            property.title,
            property.city,
            property.address,
            property.contactPhone,
            String(property.price),
            owner?.fullName,
            owner?.email,
            owner?.phone,
            listingBadge(property.listingType),
            statusLabel(property.status),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });

    return [...searched].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [properties, tab, query, userById]);

  const selected = properties.find((property) => property.id === selectedId) ?? null;
  const pendingCount = properties.filter((property) => property.status === "PENDING_APPROVAL").length;
  const selectedOwner = selected ? userById.get(selected.ownerUserId ?? "") : undefined;

  function dealerForProperty(property: Property) {
    if (!property.developerId) return undefined;
    return developers.find((developer) => developer.id === property.developerId);
  }

  function dealerBlocksApproval(property: Property) {
    const dealer = dealerForProperty(property);
    return Boolean(dealer && dealer.status !== "ACTIVE");
  }

  async function approve(property: Property) {
    if (dealerBlocksApproval(property)) {
      toast.error("Approve the dealer account before publishing this listing.");
      return;
    }
    // TODO: email seller on approval once Cloud Functions / Trigger Email are set up.
    await updateProperty(
      property.id,
      buildStatusChangePatch(property, {
        status: "PUBLISHED",
        by: admin?.fullName ?? admin?.email ?? "Admin",
        clearRejectionReason: true,
      }),
    );
    toast.success("Property published");
    setSelectedId(null);
  }

  async function reject(property: Property) {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("Please provide a reason for rejection");
      return;
    }
    setRejectError(null);
    setRejectPending(true);
    try {
      await adminApiJson(getIdToken, `/api/admin/properties/${property.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      toast.message("Property rejected");
      setRejectOpen(false);
      setRejectReason("");
      setSelectedId(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reject property.";
      toast.error(message);
    } finally {
      setRejectPending(false);
    }
  }

  return (
    <div>
      <AdminPageHeader eyebrow="Verification" title="Submissions" />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={adminTabClass(tab === item.id)}
          >
            {item.label}
            {item.id === "PENDING_APPROVAL" ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      <AdminSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search by title, submitter, city…"
      />

      <AdminTableShell>
        <Table>
          <TableHeader>
            <TableRow className="border-forest/10 hover:bg-transparent">
              <TableHead className={adminTableHeadClass}>Property</TableHead>
              <TableHead className={adminTableHeadClass}>Submitted by</TableHead>
              <TableHead className={adminTableHeadClass}>City</TableHead>
              <TableHead className={adminTableHeadClass}>Price</TableHead>
              <TableHead className={adminTableHeadClass}>Type</TableHead>
              <TableHead className={adminTableHeadClass}>Status</TableHead>
              <TableHead className={adminTableHeadClass}>Submitted</TableHead>
              <TableHead className={cn(adminTableHeadClass, "w-12")} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((property) => {
              const owner = userById.get(property.ownerUserId ?? "");
              return (
                <TableRow
                  key={property.id}
                  className="cursor-pointer border-forest/8 hover:bg-forest/[0.03]"
                  onClick={() => setSelectedId(property.id)}
                >
                  <TableCell className="px-3 py-3.5">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/properties/${property.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="relative h-12 w-16 shrink-0 overflow-hidden bg-cream"
                        aria-label={`View ${property.title}`}
                      >
                        {property.images[0] ? (
                          property.images[0].startsWith("data:") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={property.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Image src={property.images[0]} alt="" fill className="object-cover" sizes="64px" />
                          )
                        ) : null}
                      </Link>
                      <Link
                        href={`/admin/properties/${property.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-medium text-forest hover:underline"
                      >
                        {property.title}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-3.5">{owner?.fullName ?? "Unknown"}</TableCell>
                  <TableCell className="px-3 py-3.5">{property.city}</TableCell>
                  <TableCell className="px-3 py-3.5">{formatPrice(property.price)}</TableCell>
                  <TableCell className="px-3 py-3.5">
                    <Badge variant={property.listingType === "DIRECT_OWNER" ? "owner" : "verified"}>
                      {listingBadge(property.listingType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-3.5">
                    <Badge
                      variant={
                        property.status === "PENDING_APPROVAL"
                          ? "pending"
                          : property.status === "REJECTED"
                            ? "rejected"
                            : "outline"
                      }
                    >
                      {statusLabel(property.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-3.5">{formatDate(property.createdAt)}</TableCell>
                  <TableCell className="px-3 py-3.5" onClick={(event) => event.stopPropagation()}>
                    <ConfirmDeleteButton
                      label={property.title}
                      description="Permanently removes this listing (unlike Reject, which keeps a record for the seller)."
                      onConfirm={async () => {
                        await deleteProperty(property.id);
                        if (selectedId === property.id) setSelectedId(null);
                        toast.success(`Deleted “${property.title}”.`);
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className={adminEmptyCellClass}>
                  {query.trim() ? "No submissions match this search." : "No submissions in this view."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AdminTableShell>

      <SubmissionDetailModal
        property={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        submitterName={selectedOwner?.fullName ?? "Unknown"}
        submitterEmail={selectedOwner?.email}
        submitterPhone={selected?.contactPhone || selectedOwner?.phone}
        dealerBlocksApproval={selected ? dealerBlocksApproval(selected) : false}
        onApprove={() => selected && void approve(selected)}
        onReject={() => {
          setRejectReason("");
          setRejectOpen(true);
        }}
        onDelete={async () => {
          if (!selected) return;
          await deleteProperty(selected.id);
          setSelectedId(null);
          toast.success(`Deleted “${selected.title}”.`);
        }}
      />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-ivory sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Reject submission</DialogTitle>
            <DialogDescription>
              Leave a reason the seller will see on their listings page. If they have a real email on
              file, we also notify them by email.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            className="bg-white"
            placeholder="e.g. Missing title documents, price inconsistency, duplicate listing"
            value={rejectReason}
            onChange={(event) => {
              setRejectReason(event.target.value);
              if (rejectError) setRejectError(null);
            }}
          />
          {rejectError ? (
            <p className="text-sm text-destructive" role="alert">
              {rejectError}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!selected || rejectPending}
              onClick={() => selected && void reject(selected)}
            >
              {rejectPending ? "Rejecting…" : "Confirm reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
