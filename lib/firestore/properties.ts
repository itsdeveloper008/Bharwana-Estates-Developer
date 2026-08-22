import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { Property } from "@/lib/types";

const COLLECTION = "properties";

function mapProperty(id: string, data: Record<string, unknown>): Property {
  return {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    listingType: (data.listingType as Property["listingType"]) ?? "DIRECT_OWNER",
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
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
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
      batch.set(doc(db, COLLECTION, property.id), { ...property });
    });
    await batch.commit();
  }
  return properties.length;
}

export async function upsertProperty(property: Property): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await setDoc(doc(db, COLLECTION, property.id), { ...property }, { merge: true });
}

export async function deleteProperty(id: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await deleteDoc(doc(db, COLLECTION, id));
}
