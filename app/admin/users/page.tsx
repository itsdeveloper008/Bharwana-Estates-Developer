"use client";

import { useEffect, useState } from "react";
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
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { deleteUserDoc, subscribeUsers } from "@/lib/firestore/users";
import type { User } from "@/lib/types";

export default function AdminUsersPage() {
  const { admin } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      setError("Firebase is not configured on this deploy.");
      return;
    }

    setLoading(true);
    const unsub = subscribeUsers(
      (next) => {
        setUsers(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        setError("Could not load users from Firestore.");
        setLoading(false);
      },
    );

    return () => unsub?.();
  }, []);

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Accounts</p>
      <h1 className="font-serif text-2xl sm:text-3xl">Users</h1>
      <p className="mb-8 mt-2 text-sm text-muted-foreground">
        Marketplace users, live from Firebase. Admin login accounts are separate. Deleting a row
        removes the Firestore profile only — full Firebase Auth account deletion requires a
        server-side Admin SDK call (Cloud Function) in a future backend pass.
      </p>

      {error && (
        <p className="mb-4 border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
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
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isSelf = Boolean(
                  admin?.email && admin.email.toLowerCase() === user.email.toLowerCase(),
                );
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <ConfirmDeleteButton
                        label={user.fullName}
                        disabled={isSelf}
                        disabledHint="You cannot delete the account matching your signed-in admin email."
                        onConfirm={async () => {
                          try {
                            await deleteUserDoc(user.id);
                            toast.success(`Deleted “${user.fullName}”.`);
                          } catch (err) {
                            console.error(err);
                            toast.error("Could not delete user profile.");
                          }
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No registered users yet. New sign-ups will appear here in real time.
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
