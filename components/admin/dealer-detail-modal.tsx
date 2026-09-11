"use client";

import { useEffect, useState } from "react";
import {
  AdminDetailField,
  AdminDetailModal,
  AdminDetailPlaceholder,
  AdminDetailSection,
} from "@/components/admin/admin-detail-modal";
import { Badge } from "@/components/ui/badge";
import { formatCommissionRate, formatDate } from "@/lib/format";
import { displayUserEmail } from "@/lib/user-display";
import type { Developer, DeveloperOrigin, User } from "@/lib/types";

const originLabel: Record<DeveloperOrigin, string> = {
  ADMIN: "Admin-added",
  SELF_REGISTERED: "Self-registered",
};

export function DealerDetailModal({
  developer,
  linkedUser,
  linkedListings,
  pendingCommission,
  open,
  onOpenChange,
}: {
  developer: Developer | null;
  linkedUser?: User;
  linkedListings: number;
  pendingCommission: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [cached, setCached] = useState<Developer | null>(null);

  useEffect(() => {
    if (developer) setCached(developer);
  }, [developer]);

  const display = developer ?? cached;
  if (!display) return null;

  return (
    <AdminDetailModal
      open={open}
      onOpenChange={onOpenChange}
      title={display.companyName}
      badges={
        <>
          <Badge variant={display.status === "PENDING_REVIEW" ? "pending" : "verified"}>
            {display.status === "PENDING_REVIEW" ? "Pending review" : "Active"}
          </Badge>
          <Badge variant="outline">{originLabel[display.origin]}</Badge>
        </>
      }
    >
      <div className="space-y-8">
        <AdminDetailSection title="Agency">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDetailField label="Company / agency">{display.companyName}</AdminDetailField>
            <AdminDetailField label="Contact name">{display.contactPerson}</AdminDetailField>
            <AdminDetailField label="CNIC">
              {display.registrationNumber || linkedUser?.registrationNumber || (
                <AdminDetailPlaceholder />
              )}
            </AdminDetailField>
            <AdminDetailField label="Commission rate">
              {formatCommissionRate(display.commissionRate)}
            </AdminDetailField>
            <AdminDetailField label="Origin">{originLabel[display.origin]}</AdminDetailField>
            <AdminDetailField label="Registered">
              {display.createdAt ? formatDate(display.createdAt) : <AdminDetailPlaceholder />}
            </AdminDetailField>
          </div>
        </AdminDetailSection>

        <AdminDetailSection title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDetailField label="Email">
              {displayUserEmail(linkedUser?.email) ? (
                <a
                  href={`mailto:${displayUserEmail(linkedUser?.email)!}`}
                  className="text-forest underline-offset-2 hover:underline"
                >
                  {displayUserEmail(linkedUser?.email)}
                </a>
              ) : (
                <AdminDetailPlaceholder />
              )}
            </AdminDetailField>
            <AdminDetailField label="Phone">
              {linkedUser?.phone ? (
                <a
                  href={`tel:${linkedUser.phone.replace(/\s+/g, "")}`}
                  className="text-forest underline-offset-2 hover:underline"
                >
                  {linkedUser.phone}
                </a>
              ) : (
                <AdminDetailPlaceholder />
              )}
            </AdminDetailField>
            <AdminDetailField label="Linked account">
              {linkedUser?.fullName || <AdminDetailPlaceholder>No linked user</AdminDetailPlaceholder>}
            </AdminDetailField>
          </div>
        </AdminDetailSection>

        <AdminDetailSection title="Activity">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminDetailField label="Linked listings">{linkedListings}</AdminDetailField>
            <AdminDetailField label="Pending commission">
              {pendingCommission > 0 ? pendingCommission.toLocaleString("en-PK") : "None"}
            </AdminDetailField>
          </div>
        </AdminDetailSection>
      </div>
    </AdminDetailModal>
  );
}
