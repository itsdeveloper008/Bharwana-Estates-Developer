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
import { formatPrice, statusLabel } from "@/lib/format";
import { useMockStore } from "@/lib/mock-store";

export default function AdminPropertiesPage() {
  const { properties } = useMockStore();

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Inventory</p>
      <h1 className="font-serif text-3xl">Properties</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        Read-only ledger for this phase. Full CRUD arrives with the backend.
      </p>
      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id}>
                <TableCell className="font-medium">{property.title}</TableCell>
                <TableCell>{property.city}</TableCell>
                <TableCell>{property.listingType === "DIRECT_OWNER" ? "Owner" : "Business"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{statusLabel(property.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatPrice(property.price)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
