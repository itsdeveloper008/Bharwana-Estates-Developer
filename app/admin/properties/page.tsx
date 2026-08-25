"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const { properties, deleteProperty } = useMockStore();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Inventory</p>
          <h1 className="font-serif text-3xl">Properties</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Shared mock inventory. Delete removes a listing from the session store.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/properties/add">Add Property</Link>
        </Button>
      </div>
      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property) => (
              <TableRow key={property.id}>
                <TableCell className="font-medium">{property.title}</TableCell>
                <TableCell>{property.city}</TableCell>
                <TableCell>{property.listingType === "DIRECT_OWNER" ? "Owner" : "Dealer"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{statusLabel(property.status)}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatPrice(property.price)}</TableCell>
                <TableCell>
                  <ConfirmDeleteButton
                    label={property.title}
                    onConfirm={async () => {
                      await deleteProperty(property.id);
                      toast.success(`Deleted “${property.title}”.`);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
