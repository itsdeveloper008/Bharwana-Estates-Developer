"use client";

import { useEffect, useState } from "react";
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
import { isFirebaseConfigured, logFirebaseConfigDiagnostics } from "@/lib/firebase/client";
import {
  deleteNewsletterSignup,
  subscribeNewsletterSignups,
  type NewsletterSignup,
} from "@/lib/firestore/inquiries";
import { formatDate } from "@/lib/format";

export default function AdminNewsletterPage() {
  const [signups, setSignups] = useState<NewsletterSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      logFirebaseConfigDiagnostics("admin/newsletter");
      setLoading(false);
      setError("Firebase is not configured.");
      return;
    }

    setLoading(true);
    const unsub = subscribeNewsletterSignups(
      (next) => {
        setSignups(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        setError("Could not load newsletter signups from Firestore.");
        setLoading(false);
      },
    );

    return () => unsub?.();
  }, []);

  async function handleDelete(signup: NewsletterSignup) {
    try {
      await deleteNewsletterSignup(signup.id);
      toast.success(`Removed ${signup.email}`);
    } catch (err) {
      console.error(err);
      toast.error("Could not delete this signup.");
    }
  }

  return (
    <div>
      <p className="type-eyebrow">Audience</p>
      <h1 className="mb-2 font-serif text-2xl sm:text-3xl">Newsletter</h1>
      <p className="mb-8 max-w-2xl text-sm text-muted-foreground">
        Live list of footer “Stay Close” email signups written to Firestore.
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
                <TableHead>Email</TableHead>
                <TableHead>Subscribed</TableHead>
                <TableHead className="w-14 text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {signups.map((signup) => (
                <TableRow key={signup.id}>
                  <TableCell className="font-medium">{signup.email}</TableCell>
                  <TableCell>{formatDate(signup.subscribedAt)}</TableCell>
                  <TableCell className="text-right">
                    <ConfirmDeleteButton
                      label={signup.email}
                      description="Remove this email from the newsletter list?"
                      onConfirm={() => handleDelete(signup)}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {signups.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    No newsletter signups yet.
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
