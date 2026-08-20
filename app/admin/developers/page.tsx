"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { developers } from "@/lib/mock-data/developers";

export default function AdminDevelopersPage() {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Partners</p>
      <h1 className="font-serif text-3xl">Developers</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        Verified developer partners in the mock catalogue.
      </p>
      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {developers.map((developer) => (
              <TableRow key={developer.id}>
                <TableCell className="font-medium">{developer.companyName}</TableCell>
                <TableCell>{developer.contactPerson}</TableCell>
                <TableCell className="text-right">
                  {(developer.commissionRate * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
