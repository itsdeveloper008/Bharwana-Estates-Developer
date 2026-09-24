"use client";

import { useEffect, useState, type FormEvent } from "react";
import { FullNameInput } from "@/components/auth/full-name-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildDeveloperStatusChangePatch } from "@/lib/developer-status";
import {
  AGENCY_NAME_MAX_LENGTH,
  AGENCY_NAME_MESSAGE,
  isValidAgencyName,
  normalizeAgencyName,
  sanitizeAgencyName,
} from "@/lib/agency-name";
import { updateUserDealerProfile } from "@/lib/firestore/users";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { normalizePersonName } from "@/lib/person-name";
import {
  formatPakistanCnic,
  isValidPakistanCnic,
  PK_CNIC_FORMATTED_LENGTH,
} from "@/lib/schemas";
import type { Developer } from "@/lib/types";

export function DealerResubmitDialog({
  open,
  onOpenChange,
  developer,
  userId,
  onResubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developer: Developer;
  userId: string;
  onResubmit: (developerId: string, patch: Partial<Developer>) => Promise<void>;
}) {
  const [agencyName, setAgencyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAgencyName(developer.companyName ?? "");
    setContactPerson(developer.contactPerson ?? "");
    setRegistrationNumber(developer.registrationNumber ?? "");
    setError(null);
  }, [open, developer]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const company = normalizeAgencyName(agencyName);
    const contact = normalizePersonName(contactPerson);
    const cnic = formatPakistanCnic(registrationNumber);

    if (!company) {
      setError("Agency name is required.");
      return;
    }
    if (!isValidAgencyName(company)) {
      setError(AGENCY_NAME_MESSAGE);
      return;
    }
    if (!contact) {
      setError("Contact person name is required.");
      return;
    }
    if (!isValidPakistanCnic(cnic)) {
      setError("Enter a valid 13-digit CNIC (e.g. 34201-1234567-1).");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const statusPatch = buildDeveloperStatusChangePatch(developer, {
        status: "PENDING_REVIEW",
        by: contact,
        reason: "Resubmitted by dealer",
        clearRejectionReason: true,
      });

      await onResubmit(developer.id, {
        ...statusPatch,
        companyName: company,
        contactPerson: contact,
        registrationNumber: cnic,
      });

      if (isFirebaseConfigured()) {
        await updateUserDealerProfile(userId, {
          fullName: contact,
          agencyName: company,
          registrationNumber: cnic,
        });
      }

      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not resubmit for review.";
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Edit &amp; Resubmit</DialogTitle>
          <DialogDescription>
            Update the details Admin flagged, then send your agency back for review.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          {developer.rejectionReason ? (
            <div className="border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
              <p className="text-[11px] uppercase tracking-[0.14em] text-destructive/70">
                Last rejection reason
              </p>
              <p className="mt-1 leading-relaxed">{developer.rejectionReason}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="dealer-resubmit-agency">Agency / Company Name</Label>
            <Input
              id="dealer-resubmit-agency"
              value={agencyName}
              onChange={(event) =>
                setAgencyName(
                  sanitizeAgencyName(event.target.value).slice(0, AGENCY_NAME_MAX_LENGTH),
                )
              }
              maxLength={AGENCY_NAME_MAX_LENGTH}
              autoComplete="organization"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dealer-resubmit-contact">Contact person</Label>
            <FullNameInput
              id="dealer-resubmit-contact"
              value={contactPerson}
              onChange={setContactPerson}
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dealer-resubmit-cnic">CNIC</Label>
            <Input
              id="dealer-resubmit-cnic"
              value={registrationNumber}
              onChange={(event) => setRegistrationNumber(formatPakistanCnic(event.target.value))}
              maxLength={PK_CNIC_FORMATTED_LENGTH}
              inputMode="numeric"
              placeholder="XXXXX-XXXXXXX-X"
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Submitting…" : "Resubmit for review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
