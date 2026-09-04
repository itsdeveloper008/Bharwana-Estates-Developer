"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { isFirebaseConfigured, logFirebaseConfigDiagnostics } from "@/lib/firebase/client";
import {
  type CleanupPreview,
  type DeletionRequest,
  RETENTION_DAYS,
  previewRetentionCleanup,
  previewRetentionCleanupFromLists,
  purgeUserOwnedData,
  runRetentionCleanup,
  subscribeDeletionRequests,
  updateDeletionRequestStatus,
} from "@/lib/firestore/deletion";
import { useMockStore } from "@/lib/mock-store";

export default function AdminDeletionRequestsPage() {
  const { properties, inquiries, developers, deleteProperty, removeInquiry } = useMockStore();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [cleanupBusy, setCleanupBusy] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      logFirebaseConfigDiagnostics("admin/deletion-requests");
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeDeletionRequests(
      (next) => {
        setRequests(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        setError("Could not load deletion requests from Firestore.");
        setLoading(false);
      },
    );

    return () => unsub?.();
  }, []);

  const pending = useMemo(() => requests.filter((item) => item.status === "PENDING"), [requests]);

  const localPreview = useMemo(
    () => previewRetentionCleanupFromLists({ properties, inquiries, developers }),
    [properties, inquiries, developers],
  );

  async function processRequest(request: DeletionRequest) {
    setProcessingId(request.id);
    try {
      await purgeUserOwnedData(request.uid);
      await updateDeletionRequestStatus(request.id, "PROCESSED");
      toast.success(
        `Firestore data for ${request.email} removed. Firebase Auth account removal still needs a Cloud Function (Admin SDK) — noted as a future backend pass.`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Could not process this deletion request.");
    } finally {
      setProcessingId(null);
    }
  }

  async function loadPreview() {
    setPreviewBusy(true);
    try {
      if (isFirebaseConfigured()) {
        const next = await previewRetentionCleanup({ developers });
        setPreview(next);
      } else {
        setPreview(localPreview);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not build cleanup preview.");
    } finally {
      setPreviewBusy(false);
    }
  }

  async function runCleanup() {
    if (!preview) {
      toast.error("Load a preview first.");
      return;
    }
    const confirmed = window.confirm(
      `Delete ${preview.rejectedProperties.length} rejected listing(s) and ${preview.closedLostInquiries.length} closed-lost inquiry(ies)? Stale NEW inquiries and pending dealers are only flagged, not deleted.`,
    );
    if (!confirmed) return;

    setCleanupBusy(true);
    try {
      if (isFirebaseConfigured()) {
        const result = await runRetentionCleanup();
        toast.success(
          `Removed ${result.deletedProperties} listings and ${result.deletedInquiries} inquiries.`,
        );
      } else {
        for (const item of preview.rejectedProperties) {
          await deleteProperty(item.id);
        }
        for (const item of preview.closedLostInquiries) {
          await removeInquiry(item.id);
        }
        toast.success(
          `Removed ${preview.rejectedProperties.length} listings and ${preview.closedLostInquiries.length} inquiries (local).`,
        );
      }
      setPreview(null);
    } catch (err) {
      console.error(err);
      toast.error("Cleanup failed.");
    } finally {
      setCleanupBusy(false);
    }
  }

  const shownPreview = preview ?? localPreview;

  return (
    <div>
      <p className="type-eyebrow">Privacy</p>
      <h1 className="mb-2 font-serif text-2xl sm:text-3xl">Deletion & Retention</h1>
      <p className="mb-8 max-w-2xl text-sm text-forest/70">
        Review user deletion requests and run retention cleanup for stale rejected listings (
        {RETENTION_DAYS.REJECTED_PROPERTY}d) and closed-lost inquiries ({RETENTION_DAYS.CLOSED_LOST_INQUIRY}d).
        Scheduled Cloud Functions are a future backend pass — use Run Cleanup manually for now.
      </p>

      {error && (
        <p className="mb-4 border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <section className="mb-12">
        <h2 className="font-serif text-xl text-forest">Pending deletion requests</h2>
        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse border border-forest/10 bg-cream/60" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="mt-4 overflow-x-auto border border-forest/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-36" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.fullName}</TableCell>
                    <TableCell>{request.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{request.role}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs">{request.note || "—"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="rounded-xl bg-forest text-ivory hover:bg-forest-800"
                        disabled={processingId === request.id}
                        onClick={() => processRequest(request)}
                      >
                        {processingId === request.id ? "Processing…" : "Process"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-forest">Retention cleanup</h2>
            <p className="mt-1 text-sm text-forest/70">
              Preview what would be deleted, then confirm. Stale NEW inquiries (
              {RETENTION_DAYS.STALE_NEW_INQUIRY}d) and pending dealers ({RETENTION_DAYS.PENDING_DEALER}d)
              are flagged only.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={previewBusy}
              onClick={loadPreview}
            >
              {previewBusy ? "Loading…" : "Refresh preview"}
            </Button>
            <Button
              className="rounded-xl bg-forest text-ivory hover:bg-forest-800"
              disabled={cleanupBusy || shownPreview.rejectedProperties.length + shownPreview.closedLostInquiries.length === 0}
              onClick={runCleanup}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {cleanupBusy ? "Running…" : "Run Cleanup"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <PreviewCard
            title="Rejected listings to delete"
            count={shownPreview.rejectedProperties.length}
            items={shownPreview.rejectedProperties.map((item) => item.title)}
          />
          <PreviewCard
            title="Closed-lost inquiries to delete"
            count={shownPreview.closedLostInquiries.length}
            items={shownPreview.closedLostInquiries.map((item) => item.id)}
          />
          <PreviewCard
            title="Stale NEW inquiries (flag only)"
            count={shownPreview.staleNewInquiries.length}
            items={shownPreview.staleNewInquiries.map((item) => item.id)}
            muted
          />
          <PreviewCard
            title="Pending dealers (flag only)"
            count={shownPreview.pendingDealers.length}
            items={shownPreview.pendingDealers.map((item) => item.companyName)}
            muted
          />
        </div>
      </section>
    </div>
  );
}

function PreviewCard({
  title,
  count,
  items,
  muted,
}: {
  title: string;
  count: number;
  items: string[];
  muted?: boolean;
}) {
  return (
    <div className={`border px-4 py-4 ${muted ? "border-forest/10 bg-cream/40" : "border-forest/15 bg-ivory"}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-forest">{title}</p>
        <Badge variant="outline">{count}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">None</p>
      ) : (
        <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto text-xs text-forest/70">
          {items.slice(0, 8).map((item) => (
            <li key={item} className="truncate">
              {item}
            </li>
          ))}
          {items.length > 8 ? <li>…and {items.length - 8} more</li> : null}
        </ul>
      )}
    </div>
  );
}
