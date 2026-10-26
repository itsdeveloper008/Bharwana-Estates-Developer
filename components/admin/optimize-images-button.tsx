"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminApiJson } from "@/lib/admin/admin-api";
import { useAdminAuth } from "@/lib/admin-auth";

type BatchResult = {
  processed: number;
  thumbs: number;
  photos: number;
  failed: string[];
  next: string;
  done: boolean;
};

/** Super Admin one-off: build card thumbnails + browser caching for existing listing photos. */
export function OptimizeImagesButton() {
  const { isSuperAdmin, getIdToken } = useAdminAuth();
  const [progress, setProgress] = useState<string | null>(null);

  if (!isSuperAdmin) return null;

  async function run() {
    let startAfter = "";
    let listings = 0;
    let thumbs = 0;
    let photos = 0;
    let failed = 0;
    setProgress("Starting…");
    try {
      for (;;) {
        const batch = await adminApiJson<BatchResult>(getIdToken, "/api/admin/optimize-images", {
          method: "POST",
          body: JSON.stringify({ startAfter }),
        });
        listings += batch.processed;
        thumbs += batch.thumbs;
        photos += batch.photos;
        failed += batch.failed.length;
        setProgress(`${listings} listings checked…`);
        if (batch.done || !batch.next) break;
        startAfter = batch.next;
      }
      if (failed) {
        toast.error(`${failed} of ${listings} listings could not be optimized. Try again.`);
      } else if (thumbs === 0 && photos === 0) {
        toast.success(`All photos are already optimized (${listings} listings checked).`);
      } else {
        toast.success(`Photos optimized: ${thumbs} card thumbnails, ${photos} photos cached.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not optimize photos.");
    } finally {
      setProgress(null);
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={progress !== null}>
      {progress ?? "Optimize photos"}
    </Button>
  );
}
