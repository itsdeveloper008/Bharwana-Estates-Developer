import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/admin/require-super-admin";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Property, PropertyStatus } from "@/lib/types";

export const runtime = "nodejs";

const MAX_PHOTOS = 12;
const STATUSES: PropertyStatus[] = [
  "DRAFT",
  "PENDING_APPROVAL",
  "PUBLISHED",
  "RESERVED",
  "SOLD",
  "ARCHIVED",
  "REJECTED",
];

function isHttpsUrl(url: unknown): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

/** Sanitize client property payload for Admin SDK write (bypasses client rules). */
function toAdminPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const images = Array.isArray(raw.images)
    ? raw.images.filter(isHttpsUrl).map((url) => url.trim()).slice(0, MAX_PHOTOS)
    : [];

  const status = String(raw.status ?? "PENDING_APPROVAL") as PropertyStatus;
  if (!STATUSES.includes(status)) {
    throw new Error("Invalid listing status.");
  }

  const payload: Record<string, unknown> = {
    title: String(raw.title ?? "").trim(),
    description: String(raw.description ?? "").trim(),
    listingType: raw.listingType === "BUSINESS" ? "BUSINESS" : "DIRECT_OWNER",
    status,
    price: Number(raw.price),
    areaSqft: Number(raw.areaSqft),
    bedrooms: Number(raw.bedrooms ?? 0),
    bathrooms: Number(raw.bathrooms ?? 0),
    address: String(raw.address ?? "").trim(),
    city: String(raw.city ?? "").trim(),
    latitude: Number(raw.latitude ?? 0),
    longitude: Number(raw.longitude ?? 0),
    images,
    purpose: raw.purpose === "RENT" ? "RENT" : "SALE",
    featureTags: Array.isArray(raw.featureTags)
      ? raw.featureTags.filter((t): t is string => typeof t === "string").slice(0, 12)
      : [],
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const key of ["price", "areaSqft", "bedrooms", "bathrooms", "latitude", "longitude"] as const) {
    if (!Number.isFinite(payload[key] as number)) {
      throw new Error(`Invalid numeric field "${key}".`);
    }
  }

  if (!payload.title || !payload.address || !payload.city) {
    throw new Error("Title, address, and city are required.");
  }
  if (!raw.ownerUserId || typeof raw.ownerUserId !== "string") {
    throw new Error("ownerUserId is required for admin-created listings.");
  }
  payload.ownerUserId = raw.ownerUserId.trim();

  if (raw.category) payload.category = raw.category;
  if (typeof raw.subtype === "string" && raw.subtype.trim()) payload.subtype = raw.subtype.trim();
  if (typeof raw.developerId === "string" && raw.developerId.trim()) {
    payload.developerId = raw.developerId.trim();
  }
  if (typeof raw.contactPhone === "string" && raw.contactPhone.trim()) {
    payload.contactPhone = raw.contactPhone.trim();
  }
  if (raw.areaUnit) payload.areaUnit = raw.areaUnit;
  if (raw.areaValue != null && Number.isFinite(Number(raw.areaValue))) {
    payload.areaValue = Number(raw.areaValue);
  }
  if (Array.isArray(raw.highlightSpecs)) payload.highlightSpecs = raw.highlightSpecs;
  if (typeof raw.statusUpdatedAt === "string") payload.statusUpdatedAt = raw.statusUpdatedAt;
  if (Array.isArray(raw.statusHistory)) payload.statusHistory = raw.statusHistory;

  if (status === "REJECTED" && typeof raw.rejectionReason === "string" && raw.rejectionReason.trim()) {
    payload.rejectionReason = raw.rejectionReason.trim();
  }

  return payload;
}

/**
 * Admin Add/Edit Property — Firestore write via Admin SDK so on-behalf
 * ownerUserId + Publish Immediately never hit client security-rule gaps.
 * Photos must already be uploaded (HTTPS URLs) by the client.
 */
export async function PUT(request: Request) {
  try {
    let authz = await requireAdminModule(request, "properties");
    if (!authz.ok) authz = await requireAdminModule(request, "submissions");
    if (!authz.ok) authz = await requireAdminModule(request, "reports");
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    let body: { property?: Property & Record<string, unknown> };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const property = body.property;
    if (!property?.id || typeof property.id !== "string") {
      return NextResponse.json({ error: "Missing property id." }, { status: 400 });
    }

    let payload: Record<string, unknown>;
    try {
      payload = toAdminPayload(property as unknown as Record<string, unknown>);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid property payload." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const ref = db.collection("properties").doc(property.id.trim());
    const existing = await ref.get();

    if (!existing.exists) {
      payload.createdAt = FieldValue.serverTimestamp();
      delete payload.rejectionReason;
      await ref.set(payload);
    } else {
      if (payload.status !== "REJECTED") {
        payload.rejectionReason = FieldValue.delete();
        payload.rejectionEmailSentAt = FieldValue.delete();
        payload.rejectionEmailClaimedAt = FieldValue.delete();
      }
      await ref.set(payload, { merge: true });
    }

    const saved = await ref.get();
    const data = saved.data() ?? payload;
    return NextResponse.json({
      ok: true,
      property: {
        ...property,
        ...data,
        id: property.id,
        images: Array.isArray(data.images) ? data.images : property.images,
        createdAt:
          typeof data.createdAt === "string"
            ? data.createdAt
            : property.createdAt || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[api/admin/properties PUT]", error);
    return NextResponse.json({ error: "Could not save property." }, { status: 500 });
  }
}
