import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin/require-super-admin";
import { getAdminDb } from "@/lib/firebase/admin";
import { cacheListingPhotos, ensureCoverThumb } from "@/lib/server/listing-thumbs";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH = 10;

/**
 * One-off backfill: card thumbnails + long browser caching for existing listing photos.
 * Processes BATCH listings per call; the admin page loops with `startAfter` until `done`.
 */
export async function POST(request: Request) {
  const authz = await requireSuperAdmin(request);
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const body = (await request.json().catch(() => ({}))) as { startAfter?: unknown };
  const startAfter = typeof body.startAfter === "string" ? body.startAfter : "";

  let query = getAdminDb().collection("properties").orderBy("__name__").limit(BATCH);
  if (startAfter) query = query.startAfter(startAfter);
  const snap = await query.get();

  let thumbs = 0;
  let photos = 0;
  const failed: string[] = [];
  for (const doc of snap.docs) {
    try {
      if ((await ensureCoverThumb(doc.id)) === "created") thumbs++;
      photos += await cacheListingPhotos(doc.id);
    } catch (error) {
      console.error(`[api/admin/optimize-images] ${doc.id}`, error);
      failed.push(doc.id);
    }
  }

  const last = snap.docs[snap.docs.length - 1]?.id ?? "";
  return NextResponse.json({
    processed: snap.size,
    thumbs,
    photos,
    failed,
    next: last,
    done: snap.size < BATCH,
  });
}
