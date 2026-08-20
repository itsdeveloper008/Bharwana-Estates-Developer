"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { useMockStore } from "@/lib/mock-store";

export default function AdminInquiriesPage() {
  const { inquiries, properties } = useMockStore();

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Pipeline</p>
      <h1 className="font-serif text-3xl">Inquiries</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        All mock inquiries across the floor. Sales kanban remains on /sales.
      </p>
      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquiries.map((inquiry) => {
              const property = properties.find((item) => item.id === inquiry.propertyId);
              return (
                <TableRow key={inquiry.id}>
                  <TableCell className="font-medium">{inquiry.id}</TableCell>
                  <TableCell>{property?.title ?? inquiry.propertyId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inquiry.status.replaceAll("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {inquiry.notes}
                  </TableCell>
                  <TableCell>{formatDate(inquiry.createdAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
