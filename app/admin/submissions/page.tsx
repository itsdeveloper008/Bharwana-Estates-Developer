"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { users } from "@/lib/mock-data/users";
import { formatArea, formatDate, formatPrice, listingBadge, statusLabel } from "@/lib/format";
import { useMockStore } from "@/lib/mock-store";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "PENDING_APPROVAL" | "PUBLISHED" | "REJECTED" | "ALL";

const TABS: { id: Tab; label: string }[] = [
  { id: "PENDING_APPROVAL", label: "Pending" },
  { id: "PUBLISHED", label: "Approved" },
  { id: "REJECTED", label: "Rejected" },
  { id: "ALL", label: "All" },
];

export default function AdminSubmissionsPage() {
  const { properties, developers, updateProperty, deleteProperty } = useMockStore();
  const [tab, setTab] = useState<Tab>("PENDING_APPROVAL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const filtered = useMemo(() => {
    const list =
      tab === "ALL"
        ? properties.filter((property) =>
            ["PENDING_APPROVAL", "PUBLISHED", "REJECTED"].includes(property.status),
          )
        : properties.filter((property) => property.status === tab);
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [properties, tab]);

  const selected = properties.find((property) => property.id === selectedId) ?? null;
  const pendingCount = properties.filter((property) => property.status === "PENDING_APPROVAL").length;

  function dealerForProperty(property: Property) {
    if (!property.developerId) return undefined;
    return developers.find((developer) => developer.id === property.developerId);
  }

  function dealerBlocksApproval(property: Property) {
    const dealer = dealerForProperty(property);
    return Boolean(dealer && dealer.status === "PENDING_REVIEW");
  }

  async function approve(property: Property) {
    if (dealerBlocksApproval(property)) {
      toast.error("Approve the dealer account before publishing this listing.");
      return;
    }
    await updateProperty(property.id, { status: "PUBLISHED", rejectionReason: undefined });
    toast.success("Property published");
    setSelectedId(null);
  }

  async function reject(property: Property) {
    await updateProperty(property.id, {
      status: "REJECTED",
      rejectionReason: rejectReason.trim() || "Did not meet verification standards",
    });
    toast.message("Property rejected");
    setRejectOpen(false);
    setRejectReason("");
    setSelectedId(null);
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Verification</p>
      <h1 className="font-serif text-3xl">Submissions</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground">
        Review seller inventory before it reaches the public floor. {pendingCount} pending.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "border px-3 py-1.5 text-xs uppercase tracking-[0.14em] transition-colors",
              tab === item.id
                ? "border-gold bg-gold/15 text-forest"
                : "border-forest/15 text-forest/60 hover:border-forest/30",
            )}
          >
            {item.label}
            {item.id === "PENDING_APPROVAL" ? ` (${pendingCount})` : ""}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((property) => {
              const owner = users.find((user) => user.id === property.ownerUserId);
              return (
                <TableRow
                  key={property.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(property.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden bg-cream">
                        {property.images[0] ? (
                          property.images[0].startsWith("data:") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={property.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Image src={property.images[0]} alt="" fill className="object-cover" sizes="64px" />
                          )
                        ) : null}
                      </div>
                      <span className="font-medium text-forest">{property.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{owner?.fullName ?? "Unknown"}</TableCell>
                  <TableCell>{property.city}</TableCell>
                  <TableCell>{formatPrice(property.price)}</TableCell>
                  <TableCell>
                    <Badge variant={property.listingType === "DIRECT_OWNER" ? "owner" : "verified"}>
                      {listingBadge(property.listingType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
                  <TableCell>{formatDate(property.createdAt)}</TableCell>
                  <TableCell onClick={(event) => event.stopPropagation()}>
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
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No submissions in this view.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto bg-ivory sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-serif text-2xl">{selected.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="relative aspect-[16/10] overflow-hidden bg-cream">
                  {selected.images[0]?.startsWith("data:") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selected.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : selected.images[0] ? (
                    <Image src={selected.images[0]} alt="" fill className="object-cover" sizes="480px" />
                  ) : null}
                </div>
                {selected.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {selected.images.slice(1, 5).map((image, index) => (
                      <div key={`${index}-${image.slice(0, 24)}`} className="relative aspect-square overflow-hidden bg-cream">
                        {image.startsWith("data:") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Image src={image} alt="" fill className="object-cover" sizes="100px" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <Badge variant={selected.listingType === "DIRECT_OWNER" ? "owner" : "verified"}>
                    {listingBadge(selected.listingType)}
                  </Badge>
                  <p className="mt-3 font-serif text-3xl text-gold-700">{formatPrice(selected.price)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.address}, {selected.city}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-forest/80">{selected.description}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {selected.bedrooms} bed · {selected.bathrooms} bath · {formatArea(selected.areaSqft)} ·{" "}
                    {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
                  </p>
                  {selected.rejectionReason ? (
                    <p className="mt-4 border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      Rejection reason: {selected.rejectionReason}
                    </p>
                  ) : null}
                </div>
                {selected.status === "PENDING_APPROVAL" && (
                  <div className="flex flex-col gap-2">
                    {dealerBlocksApproval(selected) && (
                      <p className="border border-amber-600/25 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        Dealer account pending approval — approve the dealer first.
                      </p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        className="flex-1"
                        disabled={dealerBlocksApproval(selected)}
                        onClick={() => void approve(selected)}
                      >
                        Approve & publish
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setRejectReason("");
                          setRejectOpen(true);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
                <div className="border-t border-forest/10 pt-4">
                  <ConfirmDeleteButton
                    label={selected.title}
                    description="Permanently removes this listing (unlike Reject). This cannot be undone."
                    onConfirm={async () => {
                      await deleteProperty(selected.id);
                      setSelectedId(null);
                      toast.success(`Deleted “${selected.title}”.`);
                    }}
                  />
                  <span className="ml-2 text-xs text-muted-foreground">Delete listing entirely</span>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="bg-ivory sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Reject submission</DialogTitle>
            <DialogDescription>
              Optionally leave a reason the seller will see on their listings page.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            className="bg-white"
            placeholder="e.g. Missing title documents, price inconsistency, duplicate listing"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!selected}
              onClick={() => selected && void reject(selected)}
            >
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
