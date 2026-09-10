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
import { getDb, getFirebaseAuth, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase/client";
import { FIRESTORE_WRITE_TIMEOUT_MS, PHOTO_UPLOAD_TIMEOUT_MS } from "@/lib/firestore/errors";
import type { Property, PropertyStatusHistoryEntry } from "@/lib/types";
import { withTimeout } from "@/lib/utils";

const COLLECTION = "properties";

/** Firestore FieldValue sentinels (serverTimestamp, deleteField, …) must pass through. */
function isFieldValueSentinel(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "_methodName" in value);
}

function isStoredImageUrl(url: string) {
  return (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    (url.startsWith("/") && !url.startsWith("//"))
  );
}

function isRemoteImageUrl(url: string) {
  return isStoredImageUrl(url);
}

/**
 * Explicit allow-list — never spread the Property object into Firestore.
 * Omits `id` (doc path is source of truth) and strips nested undefined.
 */
function toFirestorePayload(property: Property): Record<string, unknown> {
  const images = (property.images ?? []).filter(
    (url): url is string => typeof url === "string" && isStoredImageUrl(url),
  );

  const payload: Record<string, unknown> = {
    title: String(property.title ?? "").trim(),
    description: String(property.description ?? "").trim(),
    listingType: property.listingType,
    status: property.status,
    price: Number(property.price),
    areaSqft: Number(property.areaSqft),
    bedrooms: Number(property.bedrooms),
    bathrooms: Number(property.bathrooms),
    address: String(property.address ?? "").trim(),
    city: String(property.city ?? "").trim(),
    latitude: Number(property.latitude),
    longitude: Number(property.longitude),
    images,
  };

  for (const key of ["price", "areaSqft", "bedrooms", "bathrooms", "latitude", "longitude"] as const) {
    if (!Number.isFinite(payload[key] as number)) {
      throw new Error(`Invalid numeric field "${key}" — check the listing form values.`);
    }
  }

  if (property.purpose) payload.purpose = property.purpose;
  if (property.category) payload.category = property.category;
  if (property.subtype?.trim()) payload.subtype = property.subtype.trim();
  if (property.ownerUserId) payload.ownerUserId = property.ownerUserId;
  if (property.developerId) payload.developerId = property.developerId;
  if (property.contactPhone?.trim()) payload.contactPhone = property.contactPhone.trim();
  if (property.statusUpdatedAt) payload.statusUpdatedAt = property.statusUpdatedAt;
  if (property.rejectionReason?.trim()) payload.rejectionReason = property.rejectionReason.trim();
  if (property.statusHistory?.length) {
    payload.statusHistory = property.statusHistory.map((entry) => {
      const item: Record<string, unknown> = {
        status: entry.status,
        at: entry.at,
      };
      if (entry.reason) item.reason = entry.reason;
      if (entry.by) item.by = entry.by;
      return item;
    });
  }

  return payload;
}

function logPropertyPayload(propertyId: string, payload: Record<string, unknown>) {
  try {
    const preview = JSON.stringify(
      payload,
      (_key, value) => {
        if (isFieldValueSentinel(value)) {
          const method =
            value && typeof value === "object" && "_methodName" in value
              ? String((value as { _methodName?: string })._methodName)
              : "FieldValue";
          return `[FieldValue:${method}]`;
        }
        if (typeof value === "string" && value.length > 120) {
          return `${value.slice(0, 80)}…(${value.length} chars)`;
        }
        return value;
      },
      2,
    );
    console.info(`[upsertProperty:${propertyId}] Firestore payload`, preview);
  } catch (error) {
    console.info(`[upsertProperty:${propertyId}] Firestore payload (unserializable)`, payload, error);
  }
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

/** Upload data:/blob: images (or raw File/Blob) to Storage so Firestore only stores URLs. */
async function resolvePropertyImages(
  propertyId: string,
  images: string[],
  imageFiles?: (File | Blob | null | undefined)[],
): Promise<string[]> {
  const needsUpload = images.some((image, index) => {
    if (imageFiles?.[index]) return true;
    return !isRemoteImageUrl(image);
  });
  if (!needsUpload) return images.filter((url) => isStoredImageUrl(url));

  const storage = getFirebaseStorage();
  if (!storage || !isFirebaseConfigured()) {
    throw new Error("Firebase Storage is not configured for photo uploads");
  }

  const auth = getFirebaseAuth();
  const uid = auth?.currentUser?.uid;
  if (!uid) {
    throw new Error("Sign in required to upload listing photos");
  }

  return Promise.all(
    images.map(async (image, index) => {
      if (isRemoteImageUrl(image) && !imageFiles?.[index]) return image;

      let raw: Blob;
      const direct = imageFiles?.[index];
      if (direct) {
        raw = direct;
      } else {
        const response = await fetch(image);
        if (!response.ok) throw new Error(`Could not read listing photo ${index + 1} for upload`);
        raw = await response.blob();
      }

      if (!raw.size) {
        throw new Error(`Photo ${index + 1} is empty. Remove it and upload again.`);
      }

      const blob = await compressImageBlob(raw);
      if (!blob.size) {
        throw new Error(`Photo ${index + 1} could not be processed. Try a JPG or PNG.`);
      }

      const contentType =
        blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg";
      const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
      const storageRef = ref(storage, `listings/${uid}/${propertyId}/${index}.${extension}`);

      try {
        await withTimeout(
          uploadBytes(storageRef, blob, { contentType }),
          PHOTO_UPLOAD_TIMEOUT_MS,
          `Photo ${index + 1} upload`,
        );
      } catch (error) {
        console.error(`[resolvePropertyImages] upload failed for photo ${index + 1}`, error);
        throw error;
      }

      const downloadUrl = await withTimeout(
        getDownloadURL(storageRef),
        FIRESTORE_WRITE_TIMEOUT_MS,
        `Photo ${index + 1} URL`,
      );
      if (!isStoredImageUrl(downloadUrl)) {
        throw new Error(`Photo ${index + 1} upload returned an invalid URL`);
      }
      return downloadUrl;
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
      ? (data.statusHistory as PropertyStatusHistoryEntry[])
          .map((entry) => {
            const mapped: PropertyStatusHistoryEntry = {
              status: entry.status,
              at: createdAtIso(entry.at),
            };
            if (entry.reason) mapped.reason = String(entry.reason);
            if (entry.by) mapped.by = String(entry.by);
            return mapped;
          })
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

export type UpsertPropertyOptions = {
  /** Parallel to `property.images` — prefer uploading these Files over fetch(blob:). */
  imageFiles?: (File | Blob | null | undefined)[];
};

export async function upsertProperty(
  property: Property,
  options?: UpsertPropertyOptions,
): Promise<Property> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  const uploadBudget = PHOTO_UPLOAD_TIMEOUT_MS * Math.max(1, property.images.length || 1);
  const images = await withTimeout(
    resolvePropertyImages(property.id, property.images, options?.imageFiles),
    uploadBudget,
    "Photo upload",
  );
  const unresolved = images.find(
    (url) => url.startsWith("blob:") || url.startsWith("data:") || !isStoredImageUrl(url),
  );
  if (unresolved) {
    throw new Error("Photo upload did not finish. Wait for photos to finish, then try again.");
  }
  if (property.images.length > 0 && images.length === 0) {
    throw new Error("No photos were uploaded successfully. Try again with smaller images.");
  }

  const next = { ...property, images };
  const ref = doc(db, COLLECTION, property.id);
  const existing = await getDoc(ref);
  const payload = toFirestorePayload(next);

  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
    delete payload.rejectionReason;
  } else if (!next.rejectionReason) {
    payload.rejectionReason = deleteField();
  }

  // Final safety: never send undefined (nested or top-level)
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) delete payload[key];
  }

  logPropertyPayload(property.id, payload);

  try {
    if (!existing.exists()) {
      await withTimeout(setDoc(ref, payload), FIRESTORE_WRITE_TIMEOUT_MS, "Property save");
    } else {
      await withTimeout(
        setDoc(ref, payload, { merge: true }),
        FIRESTORE_WRITE_TIMEOUT_MS,
        "Property save",
      );
    }
  } catch (error) {
    const err = error as { code?: string; message?: string };
    console.error(`[upsertProperty:${property.id}] Firestore write failed`, {
      code: err?.code,
      message: err?.message,
      imageCount: images.length,
      keys: Object.keys(payload),
      fieldTypes: Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [
          key,
          Array.isArray(value) ? `array(${value.length})` : isFieldValueSentinel(value) ? "FieldValue" : typeof value,
        ]),
      ),
    });
    throw error;
  }
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
