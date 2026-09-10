import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { FIRESTORE_WRITE_TIMEOUT_MS } from "@/lib/firestore/errors";
import {
  DEFAULT_DEALER_COMMISSION_RATE,
  type Developer,
  type DeveloperOrigin,
  type DeveloperStatus,
} from "@/lib/types";
import { withTimeout } from "@/lib/utils";

const COLLECTION = "developers";

function createdAtIso(value: unknown): string | undefined {
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
  return undefined;
}

function mapDeveloper(id: string, data: Record<string, unknown>): Developer {
  return {
    id,
    companyName: String(data.companyName ?? ""),
    contactPerson: String(data.contactPerson ?? ""),
    commissionRate:
      typeof data.commissionRate === "number" ? data.commissionRate : DEFAULT_DEALER_COMMISSION_RATE,
    dealerUserId: data.dealerUserId ? String(data.dealerUserId) : undefined,
    status: (data.status as DeveloperStatus) ?? "PENDING_REVIEW",
    origin: (data.origin as DeveloperOrigin) ?? "SELF_REGISTERED",
    registrationNumber: data.registrationNumber ? String(data.registrationNumber) : undefined,
    accountDeleted: data.accountDeleted === true ? true : undefined,
    createdAt: createdAtIso(data.createdAt),
  };
}

function toPayload(developer: Developer): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    companyName: developer.companyName.trim(),
    contactPerson: developer.contactPerson.trim(),
    commissionRate: developer.commissionRate,
    status: developer.status,
    origin: developer.origin,
  };
  if (developer.dealerUserId) payload.dealerUserId = developer.dealerUserId;
  if (developer.registrationNumber) payload.registrationNumber = developer.registrationNumber.trim();
  if (developer.accountDeleted === true) payload.accountDeleted = true;
  return payload;
}

export function subscribeDevelopers(
  onData: (developers: Developer[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe | null {
  const db = getDb();
  if (!db) return null;

  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      onData(snap.docs.map((item) => mapDeveloper(item.id, item.data())));
    },
    (error) => onError?.(error),
  );
}

export async function findDeveloperByUserId(uid: string): Promise<Developer | null> {
  const db = getDb();
  if (!db) return null;

  const snap = await getDocs(query(collection(db, COLLECTION), where("dealerUserId", "==", uid)));
  const first = snap.docs[0];
  if (!first) return null;
  return mapDeveloper(first.id, first.data());
}

export async function createDeveloperDoc(developer: Developer): Promise<Developer> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  const payload = {
    ...toPayload(developer),
    createdAt: serverTimestamp(),
  };

  await withTimeout(
    setDoc(doc(db, COLLECTION, developer.id), payload),
    FIRESTORE_WRITE_TIMEOUT_MS,
    "Dealer profile save",
  );

  return developer;
}

export async function updateDeveloperDoc(id: string, patch: Partial<Developer>): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  const payload = Object.fromEntries(
    Object.entries(patch).filter(([key, value]) => key !== "id" && value !== undefined),
  );
  if (Object.keys(payload).length === 0) return;

  await withTimeout(
    updateDoc(doc(db, COLLECTION, id), { ...payload, updatedAt: serverTimestamp() }),
    FIRESTORE_WRITE_TIMEOUT_MS,
    "Dealer profile update",
  );
}

export async function deleteDeveloperDoc(id: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  await withTimeout(
    deleteDoc(doc(db, COLLECTION, id)),
    FIRESTORE_WRITE_TIMEOUT_MS,
    "Dealer profile delete",
  );
}

/** Idempotent self-registered dealer profile used by signup + desk self-heal. */
export async function ensureSelfRegisteredDealer(input: {
  uid: string;
  companyName: string;
  contactPerson: string;
  registrationNumber?: string;
  commissionRate?: number;
}): Promise<Developer> {
  const existing = await findDeveloperByUserId(input.uid);
  if (existing) return existing;

  const developer: Developer = {
    id: `d-${input.uid}`,
    companyName: input.companyName.trim() || "Agency",
    contactPerson: input.contactPerson.trim() || "Dealer",
    commissionRate: input.commissionRate ?? DEFAULT_DEALER_COMMISSION_RATE,
    dealerUserId: input.uid,
    status: "PENDING_REVIEW",
    origin: "SELF_REGISTERED",
    registrationNumber: input.registrationNumber?.trim() || undefined,
  };

  return createDeveloperDoc(developer);
}
