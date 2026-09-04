"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";

export default function AccountSettingsPage() {
  const router = useRouter();
  const {
    user,
    isReady,
    deleteAccount,
    reauthenticateForDeletion,
    submitDeletionRequest,
    getAccountAuthMethod,
  } = useMockAuth();
  const { updateDeveloper, getDeveloperForUser } = useMockStore();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [needsReauth, setNeedsReauth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!user) router.replace("/login?next=/account");
  }, [isReady, user, router]);

  if (!isReady || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="h-8 w-48 animate-pulse bg-cream" />
        <div className="mt-6 h-40 animate-pulse bg-cream/80" />
      </div>
    );
  }

  const emailMatches = emailConfirm.trim().toLowerCase() === user.email.toLowerCase();
  const authMethod = getAccountAuthMethod();

  async function runDelete() {
    setBusy(true);
    try {
      if (needsReauth) {
        const reauth = await reauthenticateForDeletion(
          authMethod === "password" ? { password } : undefined,
        );
        if (!reauth.ok) {
          toast.error(reauth.error);
          return;
        }
        setNeedsReauth(false);
      }

      const linked = getDeveloperForUser(user!.id);
      const result = await deleteAccount();
      if (!result.ok) {
        if (result.needsReauth) {
          setNeedsReauth(true);
          toast.error(result.error);
          return;
        }
        toast.error(result.error);
        return;
      }

      if (linked) {
        await updateDeveloper(linked.id, { accountDeleted: true, dealerUserId: undefined });
      }

      toast.success("Your account has been deleted.");
      setDeleteOpen(false);
      router.replace("/");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequest() {
    setRequestBusy(true);
    try {
      const result = await submitDeletionRequest(requestNote);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deletion request submitted. We aim to complete it within 30 days.");
      setRequestNote("");
    } finally {
      setRequestBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20">
      <p className="type-eyebrow">Account</p>
      <h1 className="mt-3 font-serif text-4xl text-forest">Account Settings</h1>
      <p className="type-subheading mt-4">
        Manage your Bharwana profile. Deletion is permanent — see our{" "}
        <Link href="/deletion-policy" className="text-gold-700 underline-offset-2 hover:underline">
          Data Deletion
        </Link>{" "}
        policy for what is removed and what may be retained.
      </p>

      <section className="mt-10 border border-forest/10 bg-cream/40 px-5 py-6">
        <h2 className="font-serif text-2xl text-forest">Profile</h2>
        <dl className="mt-4 space-y-3 text-sm text-forest/80">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Name</dt>
            <dd className="mt-1">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Email</dt>
            <dd className="mt-1">{user.email}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Phone</dt>
            <dd className="mt-1">{user.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Role</dt>
            <dd className="mt-1">{user.role.replaceAll("_", " ")}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8 border border-destructive/20 bg-destructive/[0.03] px-5 py-6">
        <h2 className="font-serif text-2xl text-forest">Delete account</h2>
        <p className="mt-3 text-sm leading-relaxed text-forest/75">
          This removes your profile, saved residences, inquiry history as a buyer, and listings you
          own. Dealer commission records for completed sales are retained for accounting and marked
          as belonging to a deleted account. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          className="mt-5 rounded-xl"
          onClick={() => {
            setEmailConfirm("");
            setPassword("");
            setNeedsReauth(false);
            setDeleteOpen(true);
          }}
        >
          Delete Account
        </Button>
      </section>

      <section className="mt-8 border border-forest/10 px-5 py-6">
        <h2 className="font-serif text-2xl text-forest">Request deletion by Admin</h2>
        <p className="mt-3 text-sm leading-relaxed text-forest/75">
          Prefer not to use self-service, or re-authentication is blocking you? Submit a request and
          we will process it within 30 days. You can also email{" "}
          <a href="mailto:info@bharwanaestate.com" className="text-gold-700 underline-offset-2 hover:underline">
            info@bharwanaestate.com
          </a>
          .
        </p>
        <Textarea
          className="mt-4"
          placeholder="Optional note for our team"
          value={requestNote}
          onChange={(event) => setRequestNote(event.target.value)}
        />
        <Button className="mt-4 rounded-xl bg-forest text-ivory hover:bg-forest-800" disabled={requestBusy} onClick={handleRequest}>
          {requestBusy ? "Submitting…" : "Submit deletion request"}
        </Button>
      </section>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl border-forest/10 bg-ivory">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-2xl text-forest">
              Delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-forest/70">
              This permanently deletes your Bharwana account and personal data as described in our
              deletion policy. Type your email <span className="font-medium text-forest">{user.email}</span>{" "}
              to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="delete-email">Registered email</Label>
              <Input
                id="delete-email"
                className="mt-1.5"
                autoComplete="off"
                value={emailConfirm}
                onChange={(event) => setEmailConfirm(event.target.value)}
                placeholder={user.email}
              />
            </div>

            {needsReauth && authMethod === "password" && (
              <div>
                <Label htmlFor="delete-password">Confirm password</Label>
                <Input
                  id="delete-password"
                  type="password"
                  className="mt-1.5"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                />
              </div>
            )}

            {needsReauth && authMethod === "google" && (
              <p className="text-sm text-forest/70">
                You will be asked to confirm with Google before deletion continues.
              </p>
            )}

            {needsReauth && authMethod === "phone" && (
              <p className="text-sm text-forest/70">
                Phone accounts need a fresh sign-in. Sign out, sign back in with OTP, then try again —
                or submit a deletion request below.
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={busy}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={!emailMatches || busy || (needsReauth && authMethod === "phone")}
              onClick={runDelete}
            >
              {busy ? "Deleting…" : needsReauth && authMethod === "google" ? "Confirm with Google & delete" : "Delete My Account"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
