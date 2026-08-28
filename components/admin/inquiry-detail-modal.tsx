"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AdminDetailField,
  AdminDetailModal,
  AdminDetailPlaceholder,
  AdminDetailSection,
} from "@/components/admin/admin-detail-modal";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, inquiryChannelLabel, inquiryStatusLabel } from "@/lib/format";
import { parseInquiryNotes } from "@/lib/parse-inquiry-notes";
import type { Inquiry, InquiryStatus, Property } from "@/lib/types";

const INQUIRY_STATUSES: InquiryStatus[] = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "SITE_VISIT",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export function InquiryDetailModal({
  inquiry,
  property,
  open,
  onOpenChange,
  assignedRepName,
  onStatusChange,
  onDelete,
}: {
  inquiry: Inquiry | null;
  property: Property | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignedRepName?: string;
  onStatusChange: (status: InquiryStatus) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [cached, setCached] = useState<Inquiry | null>(null);

  useEffect(() => {
    if (inquiry) setCached(inquiry);
  }, [inquiry]);

  const display = inquiry ?? cached;
  if (!display) return null;

  const parsed = parseInquiryNotes(display.notes);
  const propertyTitle = property?.title ?? display.propertyId;

  async function handleStatusChange(status: InquiryStatus) {
    try {
      await onStatusChange(status);
      toast.success(`Status updated to ${inquiryStatusLabel(status)}.`);
    } catch {
      toast.error("Could not update status. Try again.");
    }
  }

  const footer = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <AdminDetailField label="Update status" className="sm:min-w-[220px]">
        <Select value={display.status} onValueChange={(value) => void handleStatusChange(value as InquiryStatus)}>
          <SelectTrigger className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INQUIRY_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {inquiryStatusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminDetailField>
      <ConfirmDeleteButton
        variant="link"
        linkText="Delete inquiry"
        label={propertyTitle}
        description="This lead will be removed from Firestore permanently."
        onConfirm={onDelete}
      />
    </div>
  );

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        property ? (
          <Link
            href={`/property/${property.id}`}
            className="underline-offset-4 transition-colors hover:text-gold-700 hover:underline"
          >
            {property.title}
          </Link>
        ) : (
          propertyTitle
        )
      }
      badges={
        <>
          <Badge variant={display.channel === "PLATFORM_ASSISTED" ? "platform" : "direct"}>
            {inquiryChannelLabel(display.channel)}
          </Badge>
          <Badge variant="outline">{inquiryStatusLabel(display.status)}</Badge>
        </>
      }
      footer={footer}
    >
      <div className="space-y-8">
        <AdminDetailSection title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDetailField label="Full name">
              {parsed.fullName ?? <AdminDetailPlaceholder />}
            </AdminDetailField>
            <AdminDetailField label="Phone">
              {parsed.phone ? (
                <a href={`tel:${parsed.phone.replace(/\s/g, "")}`} className="underline-offset-2 hover:underline">
                  {parsed.phone}
                </a>
              ) : (
                <AdminDetailPlaceholder />
              )}
            </AdminDetailField>
            <AdminDetailField label="Email">
              {parsed.email ? (
                <a href={`mailto:${parsed.email}`} className="underline-offset-2 hover:underline">
                  {parsed.email}
                </a>
              ) : (
                <AdminDetailPlaceholder />
              )}
            </AdminDetailField>
            <AdminDetailField label="Preferred visit">
              {parsed.visitDate ?? <AdminDetailPlaceholder />}
            </AdminDetailField>
          </div>
        </AdminDetailSection>

        <AdminDetailSection title="Message">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-forest/80">
            {parsed.message ?? <AdminDetailPlaceholder />}
          </p>
          {parsed.isDirectReveal ? (
            <p className="mt-2 text-xs text-muted-foreground">Direct-to-seller reveal — no platform mediation.</p>
          ) : null}
        </AdminDetailSection>

        <AdminDetailSection title="Lead details">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDetailField label="Inquiry ID">
              <span className="font-mono text-xs">{display.id}</span>
            </AdminDetailField>
            <AdminDetailField label="Submitted">
              {formatDateTime(display.createdAt)}
            </AdminDetailField>
            {display.channel === "PLATFORM_ASSISTED" || display.assignedSalesId ? (
              <AdminDetailField label="Assigned sales rep">
                {assignedRepName ?? <AdminDetailPlaceholder />}
              </AdminDetailField>
            ) : null}
            <AdminDetailField label="Property ID">
              <span className="font-mono text-xs">{display.propertyId}</span>
            </AdminDetailField>
          </div>
        </AdminDetailSection>
      </div>
    </AdminDetailModal>
  );
}
