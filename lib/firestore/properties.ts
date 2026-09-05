import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getDb, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase/client";
import { FIRESTORE_WRITE_TIMEOUT_MS } from "@/lib/firestore/errors";
import type { Property, PropertyStatusHistoryEntry } from "@/lib/types";
import { withTimeout } from "@/lib/utils";

const COLLECTION = "properties";

/** Firestore rejects `undefined` field values — omit them from writes. */
function toFirestorePayload(property: Property): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(property).filter(([, value]) => value !== undefined),
  );
}

function isRemoteImageUrl(url: string) {
  return url.startsWith("https://") || url.startsWith("http://") || url.startsWith("/");
}

/** Shrink listing photos before Storage upload so submit is not stuck on multi‑MB files. */
async function compressImageBlob(blob: Blob, maxEdge = 1600, quality = 0.72): Promise<Blob> {
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && blob.size < 400_000 && blob.type === "image/jpeg") {
      bitmap.close();
      return blob;
    }
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return blob;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const compressed = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), "image/jpeg", quality);
    });
    return compressed && compressed.size > 0 ? compressed : blob;
  } catch {
    return blob;
  }
}

/** Upload data:/blob: images to Storage so Firestore only stores URLs (1MB doc limit). */
async function resolvePropertyImages(propertyId: string, images: string[]): Promise<string[]> {
  const needsUpload = images.some((image) => !isRemoteImageUrl(image));
  if (!needsUpload) return images;

  const storage = getFirebaseStorage();
  if (!storage || !isFirebaseConfigured()) {
    throw new Error("Firebase Storage is not configured for photo uploads");
  }

  return Promise.all(
    images.map(async (image, index) => {
      if (isRemoteImageUrl(image)) return image;
      const response = await fetch(image);
      if (!response.ok) throw new Error("Could not read a listing photo for upload");
      const raw = await response.blob();
      const blob = await compressImageBlob(raw);
      const storageRef = ref(storage, `team/listings/${propertyId}/${index}.jpg`);
      await withTimeout(
        uploadBytes(storageRef, blob, { contentType: "image/jpeg" }),
        FIRESTORE_WRITE_TIMEOUT_MS,
        "Photo upload",
      );
      return withTimeout(
        getDownloadURL(storageRef),
        FIRESTORE_WRITE_TIMEOUT_MS,
        "Photo URL",
      );
    }),
  );
}

function createdAtIso(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      // fall through
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function mapProperty(id: string, data: Record<string, unknown>): Property {
  return {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    listingType: (data.listingType as Property["listingType"]) ?? "DIRECT_OWNER",
    purpose: data.purpose ? (data.purpose as Property["purpose"]) : undefined,
    category: data.category ? (data.category as Property["category"]) : undefined,
    subtype: data.subtype ? String(data.subtype) : undefined,
    status: (data.status as Property["status"]) ?? "PUBLISHED",
    price: Number(data.price ?? 0),
    areaSqft: Number(data.areaSqft ?? 0),
    bedrooms: Number(data.bedrooms ?? 0),
    bathrooms: Number(data.bathrooms ?? 0),
    address: String(data.address ?? ""),
    city: String(data.city ?? ""),
    latitude: Number(data.latitude ?? 0),
    longitude: Number(data.longitude ?? 0),
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    ownerUserId: data.ownerUserId ? String(data.ownerUserId) : undefined,
    developerId: data.developerId ? String(data.developerId) : undefined,
    contactPhone: data.contactPhone ? String(data.contactPhone) : undefined,
    createdAt: createdAtIso(data.createdAt),
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
    statusUpdatedAt: data.statusUpdatedAt ? createdAtIso(data.statusUpdatedAt) : undefined,
    statusHistory: Array.isArray(data.statusHistory)
      ? (data.statusHistory as PropertyStatusHistoryEntry[]).map((entry) => ({
          status: entry.status,
          reason: entry.reason ? String(entry.reason) : undefined,
          at: createdAtIso(entry.at),
          by: entry.by ? String(entry.by) : undefined,
        }))
      : undefined,
  };
}

export function subscribeProperties(
  onData: (properties: Property[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe | null {
  const db = getDb();
  if (!db) return null;

  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      onData(snap.docs.map((item) => mapProperty(item.id, item.data())));
    },
    (error) => onError?.(error),
  );
}

/** Replace inventory in Firestore. When force=true, deletes existing docs first. */
export async function seedProperties(properties: Property[], force = false): Promise<number> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  const existing = await getDocs(collection(db, COLLECTION));
  if (!existing.empty && !force) return 0;

  if (!existing.empty && force) {
    const chunkSize = 400;
    const docs = existing.docs;
    for (let i = 0; i < docs.length; i += chunkSize) {
      const chunk = docs.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((item) => batch.delete(item.ref));
      await batch.commit();
    }
  }

  const chunkSize = 400;
  for (let i = 0; i < properties.length; i += chunkSize) {
    const chunk = properties.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((property) => {
      batch.set(doc(db, COLLECTION, property.id), toFirestorePayload(property));
    });
    await batch.commit();
  }
  return properties.length;
}

export async function upsertProperty(property: Property): Promise<Property> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  const images = await withTimeout(
    resolvePropertyImages(property.id, property.images),
    FIRESTORE_WRITE_TIMEOUT_MS,
    "Photo upload",
  );
  const next = { ...property, images };
  const ref = doc(db, COLLECTION, property.id);
  const existing = await getDoc(ref);
  const payload = toFirestorePayload(next);
  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
  }
  // merge:true omits undefined fields — explicitly clear rejection when absent
  if (!next.rejectionReason) {
    payload.rejectionReason = deleteField();
  }
  await withTimeout(
    setDoc(ref, payload, { merge: true }),
    FIRESTORE_WRITE_TIMEOUT_MS,
    "Property save",
  );
  return next;
}

export async function deleteProperty(id: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await deleteDoc(doc(db, COLLECTION, id));
}

/** Delete every document in the properties collection (QA / demo reset). */
export async function clearAllProperties(): Promise<number> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  const existing = await getDocs(collection(db, COLLECTION));
  if (existing.empty) return 0;

  const chunkSize = 400;
  const docs = existing.docs;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((item) => batch.delete(item.ref));
    await batch.commit();
  }
  return docs.length;
}
