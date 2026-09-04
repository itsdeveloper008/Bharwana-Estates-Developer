"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, statusLabel } from "@/lib/format";
import type { Property, PropertyStatus } from "@/lib/types";

function statusBadgeVariant(status: PropertyStatus) {
  if (status === "PENDING_APPROVAL") return "pending" as const;
  if (status === "REJECTED") return "rejected" as const;
  if (status === "PUBLISHED") return "verified" as const;
  return "outline" as const;
}

export function SellerListingActions({
  property,
  editHref,
}: {
  property: Property;
  editHref: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={statusBadgeVariant(property.status)}>{statusLabel(property.status)}</Badge>
      {property.status === "PUBLISHED" || property.status === "RESERVED" ? (
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link href={`/property/${property.id}`}>View</Link>
        </Button>
      ) : null}
      {property.status === "REJECTED" || property.status === "DRAFT" ? (
        <Button asChild size="sm" className="rounded-xl bg-forest text-ivory hover:bg-forest-800">
          <Link href={editHref}>Edit & Resubmit</Link>
        </Button>
      ) : null}
      {property.status === "REJECTED" ? (
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <a href="mailto:info@bharwanaestate.com?subject=Question%20about%20rejected%20listing">
            Contact Support
          </a>
        </Button>
      ) : null}
    </div>
  );
}

export function SellerRejectionNotice({ property }: { property: Property }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  if (property.status !== "REJECTED") return null;

  const reason =
    property.rejectionReason?.trim() || "Not approved — contact support for details";
  const rejectionEntries = (property.statusHistory ?? [])
    .filter((entry) => entry.status === "REJECTED")
    .slice()
    .reverse();
  const older = rejectionEntries.slice(1, 3);

  return (
    <div className="mt-3 max-w-xl space-y-2">
      <div className="border border-destructive/25 bg-destructive/[0.06] px-3 py-2.5 text-sm text-destructive">
        <p className="font-medium">Not approved</p>
        <p className="mt-1 leading-relaxed text-destructive/90">{reason}</p>
      </div>
      {older.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            className="text-xs font-medium uppercase tracking-[0.14em] text-forest/60 underline-offset-2 hover:text-forest hover:underline"
          >
            {historyOpen ? "Hide earlier notes" : `Earlier rejection notes (${older.length})`}
          </button>
          {historyOpen ? (
            <ul className="mt-2 space-y-2 border-l border-forest/15 pl-3">
              {older.map((entry) => (
                <li key={`${entry.at}-${entry.reason}`} className="text-xs text-forest/70">
                  <span className="uppercase tracking-[0.12em] text-muted-foreground">
                    {formatDate(entry.at)}
                    {entry.by ? ` · ${entry.by}` : ""}
                  </span>
                  <p className="mt-0.5">{entry.reason || "No reason recorded"}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
