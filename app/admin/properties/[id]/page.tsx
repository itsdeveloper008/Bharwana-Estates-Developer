"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AdminPropertyDetailBody } from "@/components/admin/admin-property-detail";
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
import { Textarea } from "@/components/ui/textarea";
import { listingBadge, statusLabel } from "@/lib/format";
import { useAdminAuth } from "@/lib/admin-auth";
import { useMockStore } from "@/lib/mock-store";
import { buildStatusChangePatch } from "@/lib/property-status";
import type { Property } from "@/lib/types";

export default function AdminPropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { admin } = useAdminAuth();
  const { properties, developers, users, updateProperty, deleteProperty } = useMockStore();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const property = useMemo(
    () => properties.find((item) => item.id === id) ?? null,
    [properties, id],
  );

  const owner = property ? users.find((user) => user.id === property.ownerUserId) : undefined;
  const dealer = property?.developerId
    ? developers.find((item) => item.id === property.developerId)
    : undefined;
  const dealerBlocksApproval = Boolean(dealer && dealer.status === "PENDING_REVIEW");

  async function approve(target: Property) {
    if (dealerBlocksApproval) {
      toast.error("Approve the dealer account before publishing this listing.");
      return;
    }
    await updateProperty(
      target.id,
      buildStatusChangePatch(target, {
        status: "PUBLISHED",
        by: admin?.fullName ?? admin?.email ?? "Admin",
        clearRejectionReason: true,
      }),
    );
    toast.success("Property published");
  }

  async function reject(target: Property) {
    const reason = rejectReason.trim() || "Did not meet verification standards";
    await updateProperty(
      target.id,
      buildStatusChangePatch(target, {
        status: "REJECTED",
        reason,
        by: admin?.fullName ?? admin?.email ?? "Admin",
      }),
    );
    toast.message("Property rejected");
    setRejectOpen(false);
    setRejectReason("");
  }

  if (!property) {
    return (
      <div className="space-y-4 py-10">
        <p className="text-sm text-muted-foreground">Property not found.</p>
        <Button asChild variant="outline">
          <Link href="/admin/properties">Back to properties</Link>
        </Button>
      </div>
    );
  }

  const submitterName = owner?.fullName ?? "Unknown";
  const submitterEmail = owner?.email;
  const submitterPhone = property.contactPhone || owner?.phone;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-forest/70">
            <Link href="/admin/properties">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Properties
            </Link>
          </Button>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
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
              <Badge variant={property.listingType === "DIRECT_OWNER" ? "owner" : "verified"}>
                {listingBadge(property.listingType)}
              </Badge>
            </div>
            <h1 className="font-serif text-3xl text-forest">{property.title}</h1>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
          {property.status === "PENDING_APPROVAL" ? (
            <>
              {dealerBlocksApproval ? (
                <p className="border border-amber-600/25 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Dealer account pending approval. Approve the dealer first.
                </p>
              ) : null}
              <Button disabled={dealerBlocksApproval} onClick={() => void approve(property)}>
                Approve & publish
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRejectReason("");
                  setRejectOpen(true);
                }}
              >
                Reject
              </Button>
            </>
          ) : null}
          <ConfirmDeleteButton
            variant="link"
            label={property.title}
            description="Permanently removes this listing. This cannot be undone."
            onConfirm={async () => {
              await deleteProperty(property.id);
              toast.success(`Deleted “${property.title}”.`);
              router.push("/admin/properties");
            }}
          />
        </div>
      </div>

      <AdminPropertyDetailBody
        property={property}
        submitterName={submitterName}
        submitterEmail={submitterEmail}
        submitterPhone={submitterPhone}
      />

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
            <Button variant="destructive" onClick={() => void reject(property)}>
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
