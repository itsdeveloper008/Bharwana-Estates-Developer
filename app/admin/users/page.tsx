"use client";

import { useState } from "react";
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
import { useAdminAuth } from "@/lib/admin-auth";
import { users as seedUsers } from "@/lib/mock-data/users";
import type { User } from "@/lib/types";

export default function AdminUsersPage() {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState<User[]>(seedUsers);

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Accounts</p>
      <h1 className="font-serif text-3xl">Users</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        Marketplace users from mock data. Admin login accounts are separate.
      </p>
      <div className="overflow-x-auto border border-forest/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = Boolean(admin?.email && admin.email.toLowerCase() === user.email.toLowerCase());
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.role.replaceAll("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <ConfirmDeleteButton
                      label={user.fullName}
                      disabled={isSelf}
                      disabledHint="You cannot delete the account matching your signed-in admin email."
                      onConfirm={() => {
                        setUsers((current) => current.filter((item) => item.id !== user.id));
                        toast.success(`Deleted “${user.fullName}”.`);
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
