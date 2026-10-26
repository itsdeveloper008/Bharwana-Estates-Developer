import { NextResponse } from "next/server";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { clientIp, enforce } from "@/lib/rate-limit";
import { cacheListingPhotos, ensureCoverThumb } from "@/lib/server/listing-thumbs";

export const runtime = "nodejs";

/**
 * Build the small card cover for one listing after it is saved.
 * Public but harmless: it only derives a thumb from photos already on the listing.
 */
export async function POST(request: Request) {
  const blocked = await enforce([["listing-thumb-ip", clientIp(request), 30, 600_000]]);
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
    const thumb = await ensureCoverThumb(id);
    const cached = await cacheListingPhotos(id);
    return NextResponse.json({ thumb, cached });
  } catch (error) {
    console.error("[api/properties/thumb]", error);
    return NextResponse.json({ error: "Could not build thumbnail." }, { status: 500 });
  }
}
