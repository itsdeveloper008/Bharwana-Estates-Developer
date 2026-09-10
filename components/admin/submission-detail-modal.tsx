"use client";

import { useEffect, useState } from "react";
import { AdminPropertyDetailBody } from "@/components/admin/admin-property-detail";
import { AdminDetailModal } from "@/components/admin/admin-detail-modal";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listingBadge, statusLabel } from "@/lib/format";
import type { Property } from "@/lib/types";

export function SubmissionDetailModal({
  property,
  open,
  onOpenChange,
  submitterName,
  submitterEmail,
  submitterPhone,
  dealerBlocksApproval,
  onApprove,
  onReject,
  onDelete,
}: {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitterName: string;
  submitterEmail?: string;
  submitterPhone?: string;
  dealerBlocksApproval: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const [cached, setCached] = useState<Property | null>(null);

  useEffect(() => {
    if (property) setCached(property);
  }, [property]);

  const display = property ?? cached;
  if (!display) return null;

  const footer =
    display.status === "PENDING_APPROVAL" ? (
      <div className="space-y-3">
        {dealerBlocksApproval && (
          <p className="border border-amber-600/25 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Dealer account pending approval. Approve the dealer first.
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button className="flex-1" disabled={dealerBlocksApproval} onClick={onApprove}>
            Approve & publish
          </Button>
          <Button variant="outline" className="flex-1" onClick={onReject}>
            Reject
          </Button>
        </div>
        <div className="flex justify-center sm:justify-start">
          <ConfirmDeleteButton
            variant="link"
            label={display.title}
            description="Permanently removes this listing (unlike Reject). This cannot be undone."
            onConfirm={onDelete}
          />
        </div>
      </div>
    ) : (
      <div className="flex justify-start">
        <ConfirmDeleteButton
          variant="link"
          label={display.title}
          description="Permanently removes this listing. This cannot be undone."
          onConfirm={onDelete}
        />
      </div>
    );

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={display.title}
      badges={
        <>
          <Badge
            variant={
              display.status === "PENDING_APPROVAL"
                ? "pending"
                : display.status === "REJECTED"
                  ? "rejected"
                  : "outline"
            }
          >
            {statusLabel(display.status)}
          </Badge>
          <Badge variant={display.listingType === "DIRECT_OWNER" ? "owner" : "verified"}>
            {listingBadge(display.listingType)}
          </Badge>
        </>
      }
      footer={footer}
    >
      <AdminPropertyDetailBody
        property={display}
        submitterName={submitterName}
        submitterEmail={submitterEmail}
        submitterPhone={submitterPhone}
      />
    </AdminDetailModal>
  );
}
