"use client";

import { useState } from "react";
import { toast } from "sonner";
import { InquiryDetailModal } from "@/components/admin/inquiry-detail-modal";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, inquiryChannelLabel, inquiryStatusLabel } from "@/lib/format";
import { useMockStore } from "@/lib/mock-store";

export default function AdminInquiriesPage() {
  const {
    inquiries,
    properties,
    users,
    inquiriesLoading,
    inquiriesError,
    usingFirestoreInquiries,
    removeInquiry,
    updateInquiryStatus,
  } = useMockStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = inquiries.find((inquiry) => inquiry.id === selectedId) ?? null;
  const selectedProperty = selected
    ? properties.find((property) => property.id === selected.propertyId)
    : undefined;
  const assignedRep = selected?.assignedSalesId
    ? users.find((user) => user.id === selected.assignedSalesId)
    : undefined;

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Pipeline</p>
      <h1 className="font-serif text-3xl">Inquiries</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        {usingFirestoreInquiries
          ? "Live from Firestore — new leads appear without refresh. Click a row to view full details."
          : "Local-only until Firebase is configured on this deploy. Leads will not sync across devices."}
      </p>

      {inquiriesError && (
        <p className="mb-4 border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {inquiriesError}
        </p>
      )}

      {inquiriesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse border border-forest/10 bg-cream/60" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto border border-forest/10">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inquiry) => {
                const property = properties.find((item) => item.id === inquiry.propertyId);
                return (
                  <TableRow
                    key={inquiry.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(inquiry.id)}
                  >
                    <TableCell className="font-medium">{inquiry.id.slice(0, 12)}</TableCell>
                    <TableCell>{property?.title ?? inquiry.propertyId}</TableCell>
                    <TableCell>
                      <Badge variant={inquiry.channel === "PLATFORM_ASSISTED" ? "platform" : "direct"}>
                        {inquiryChannelLabel(inquiry.channel)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{inquiryStatusLabel(inquiry.status)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {inquiry.notes}
                    </TableCell>
                    <TableCell>{formatDate(inquiry.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
              {inquiries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No inquiries yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <InquiryDetailModal
        inquiry={selected}
        property={selectedProperty}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
        assignedRepName={assignedRep?.fullName}
        onStatusChange={async (status) => {
          if (!selected) return;
          await updateInquiryStatus(selected.id, status);
        }}
        onDelete={async () => {
          if (!selected) return;
          const label = selectedProperty?.title ?? selected.id;
          await removeInquiry(selected.id);
          setSelectedId(null);
          toast.success(`Deleted inquiry for “${label}”.`);
        }}
      />
    </div>
  );
}
