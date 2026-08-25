"use client";

import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, inquiryChannelLabel } from "@/lib/format";
import { useMockStore } from "@/lib/mock-store";

export default function AdminInquiriesPage() {
  const {
    inquiries,
    properties,
    inquiriesLoading,
    inquiriesError,
    usingFirestoreInquiries,
    removeInquiry,
  } = useMockStore();

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Pipeline</p>
      <h1 className="font-serif text-3xl">Inquiries</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        {usingFirestoreInquiries
          ? "Live from Firestore — new leads appear without refresh."
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
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inquiries.map((inquiry) => {
                const property = properties.find((item) => item.id === inquiry.propertyId);
                const label = property?.title ?? inquiry.id;
                return (
                  <TableRow key={inquiry.id}>
                    <TableCell className="font-medium">{inquiry.id.slice(0, 12)}</TableCell>
                    <TableCell>{property?.title ?? inquiry.propertyId}</TableCell>
                    <TableCell>
                      <Badge variant={inquiry.channel === "PLATFORM_ASSISTED" ? "platform" : "direct"}>
                        {inquiryChannelLabel(inquiry.channel)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{inquiry.status.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {inquiry.notes}
                    </TableCell>
                    <TableCell>{formatDate(inquiry.createdAt)}</TableCell>
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <ConfirmDeleteButton
                        label={label}
                        description="This lead will be removed from Firestore permanently."
                        onConfirm={async () => {
                          await removeInquiry(inquiry.id);
                          toast.success(`Deleted inquiry for “${label}”.`);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {inquiries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No inquiries yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
