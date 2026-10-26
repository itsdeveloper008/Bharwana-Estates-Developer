import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { clientIp, enforce } from "@/lib/rate-limit";
import { ensureCoverThumb, ensureWatermarked } from "@/lib/server/listing-thumbs";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Post-save photo processing for one listing: watermark new photos, then build the small card cover.
 * Public but harmless: it only derives from photos already on the listing and is idempotent.
 */
export async function POST(request: Request) {
  const blocked = await enforce([["listing-process-ip", clientIp(request), 60, 600_000]]);
  if (blocked) return blocked;
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  const id = String(body.id ?? "").trim();
  if (!id || id.length > 128 || !/^[\w.-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid property id." }, { status: 400 });
  }

  try {
    const watermarked = await ensureWatermarked(id);
    const thumb = await ensureCoverThumb(id);
    return NextResponse.json({ watermarked, thumb });
  } catch (error) {
    console.error("[api/properties/process]", error);
    return NextResponse.json({ error: "Could not process listing photos." }, { status: 500 });
  }
}
