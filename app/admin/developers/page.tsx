"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeleteButton } from "@/components/admin/confirm-delete-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { developers as seedDevelopers } from "@/lib/mock-data/developers";
import { useMockStore } from "@/lib/mock-store";
import type { Developer } from "@/lib/types";

export default function AdminDevelopersPage() {
  const { properties } = useMockStore();
  const [developers, setDevelopers] = useState<Developer[]>(seedDevelopers);

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Partners</p>
      <h1 className="font-serif text-3xl">Dealers</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        Verified Dealer partners in the mock catalogue.
      </p>
      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {developers.map((developer) => {
              const linked = properties.filter((property) => property.developerId === developer.id).length;
              return (
                <TableRow key={developer.id}>
                  <TableCell className="font-medium">{developer.companyName}</TableCell>
                  <TableCell>{developer.contactPerson}</TableCell>
                  <TableCell className="text-right">
                    {(developer.commissionRate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <ConfirmDeleteButton
                      label={developer.companyName}
                      description={
                        linked > 0
                          ? `This Dealer has ${linked} linked ${linked === 1 ? "property" : "properties"}. Deleting will orphan those listings — are you sure? This cannot be undone.`
                          : "This cannot be undone."
                      }
                      onConfirm={() => {
                        setDevelopers((current) => current.filter((item) => item.id !== developer.id));
                        toast.success(`Deleted “${developer.companyName}”.`);
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {developers.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No Dealers left in this session.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
