"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Bath, BedDouble, Maximize2 } from "lucide-react";
import {
  AdminDetailField,
  AdminDetailModal,
  AdminDetailPlaceholder,
  AdminDetailSection,
} from "@/components/admin/admin-detail-modal";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice, listingBadge, statusLabel } from "@/lib/format";
import { purposeLabel, subtypeLabel } from "@/lib/property-taxonomy";
import { propertySpecItems } from "@/lib/property-specs";
import type { Property } from "@/lib/types";
import { PropertyGallery } from "@/components/properties/property-gallery";

const MiniMap = dynamic(() => import("@/components/map/map-canvas").then((mod) => mod.MiniMap), {
  ssr: false,
});

export function SubmissionDetailModal({
  property,
  open,
  onOpenChange,
  submitterName,
  submitterEmail,
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

  const specs = propertySpecItems(display);
  const specIcons = { Bedrooms: BedDouble, Bathrooms: Bath, Area: Maximize2 };

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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div>
          <PropertyGallery images={display.images} title={display.title} />
          <AdminDetailSection title="Location" className="mt-8 lg:hidden">
            <MiniMap property={display} />
          </AdminDetailSection>
        </div>

        <div className="space-y-8">
          <div>
            <p className="font-serif text-3xl text-gold-700">{formatPrice(display.price)}</p>
            <p className="mt-2 type-eyebrow">
              {purposeLabel(display.purpose)} ·{" "}
              {subtypeLabel(display.category, display.subtype) || "Type"}
            </p>
          </div>

          <AdminDetailSection title="Address">
            <p className="text-sm leading-relaxed text-forest/90">
              {display.address}, {display.city}
            </p>
          </AdminDetailSection>

          <AdminDetailSection title="Specifications">
            <div className="grid grid-cols-3 gap-3 border-y border-forest/10 py-4">
              {specs.map((spec) => {
                const Icon = specIcons[spec.label as keyof typeof specIcons] ?? Maximize2;
                return (
                  <div key={spec.label}>
                    <Icon className="h-4 w-4 text-gold" />
                    <p className="mt-2 text-sm font-medium text-forest">{spec.value}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      {spec.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </AdminDetailSection>

          <AdminDetailSection title="Description">
            <p className="text-sm leading-relaxed text-forest/80">
              {display.description || <AdminDetailPlaceholder />}
            </p>
          </AdminDetailSection>

          <AdminDetailSection title="Submission">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminDetailField label="Submitted by">
                {submitterEmail ? (
                  <a href={`mailto:${submitterEmail}`} className="text-forest underline-offset-2 hover:underline">
                    {submitterName}
                  </a>
                ) : (
                  submitterName || <AdminDetailPlaceholder />
                )}
              </AdminDetailField>
              <AdminDetailField label="City">{display.city}</AdminDetailField>
              <AdminDetailField label="Submitted">{formatDate(display.createdAt)}</AdminDetailField>
            </div>
          </AdminDetailSection>

          {display.rejectionReason ? (
            <p className="border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Rejection reason: {display.rejectionReason}
            </p>
          ) : null}

          <AdminDetailSection title="Map" className="hidden lg:block">
            <MiniMap property={display} />
          </AdminDetailSection>
        </div>
      </div>
    </AdminDetailModal>
  );
}
