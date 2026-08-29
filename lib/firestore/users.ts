import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { FIRESTORE_WRITE_TIMEOUT_MS } from "@/lib/firestore/errors";
import type { User, UserRole } from "@/lib/types";
import { withTimeout } from "@/lib/utils";

const COLLECTION = "users";

export type UserDocInput = {
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  agencyName?: string;
  registrationNumber?: string;
};

function mapUser(id: string, data: Record<string, unknown>): User {
  return {
    id,
    fullName: String(data.fullName ?? ""),
    email: String(data.email ?? ""),
    phone: String(data.phone ?? ""),
    role: (data.role as User["role"]) ?? "BUYER",
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
    savedPropertyIds: Array.isArray(data.savedPropertyIds)
      ? (data.savedPropertyIds as string[])
      : [],
  };
}

export function subscribeUsers(
  onData: (users: User[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe | null {
  const db = getDb();
  if (!db) return null;

  return onSnapshot(
    collection(db, COLLECTION),
    (snap) => {
      onData(snap.docs.map((item) => mapUser(item.id, item.data())));
    },
    (error) => onError?.(error),
  );
}

export function subscribeUser(
  uid: string,
  onData: (user: User | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe | null {
  const db = getDb();
  if (!db) return null;

  return onSnapshot(
    doc(db, COLLECTION, uid),
    (snap) => {
      onData(snap.exists() ? mapUser(snap.id, snap.data()) : null);
    },
    (error) => onError?.(error),
  );
}

export async function getUserDoc(uid: string): Promise<User | null> {
  const db = getDb();
  if (!db) return null;
  const snap = await getDoc(doc(db, COLLECTION, uid));
  if (!snap.exists()) return null;
  return mapUser(snap.id, snap.data());
}

export async function createUserDoc(uid: string, input: UserDocInput): Promise<User> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  const payload: Record<string, unknown> = {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    role: input.role,
    savedPropertyIds: [],
    createdAt: serverTimestamp(),
  };
  if (input.avatarUrl) payload.avatarUrl = input.avatarUrl;
  if (input.agencyName) payload.agencyName = input.agencyName.trim();
  if (input.registrationNumber) payload.registrationNumber = input.registrationNumber.trim();

  await withTimeout(
    setDoc(doc(db, COLLECTION, uid), payload),
    FIRESTORE_WRITE_TIMEOUT_MS,
    "User profile save",
  );

  return {
    id: uid,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    role: input.role,
    avatarUrl: input.avatarUrl,
    savedPropertyIds: [],
  };
}

/** Removes the Firestore profile only — Firebase Auth account deletion needs Admin SDK / Cloud Function. */
export async function deleteUserDoc(uid: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await deleteDoc(doc(db, COLLECTION, uid));
}

export async function addSavedProperty(uid: string, propertyId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await updateDoc(doc(db, COLLECTION, uid), {
    savedPropertyIds: arrayUnion(propertyId),
  });
}

export async function removeSavedProperty(uid: string, propertyId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await updateDoc(doc(db, COLLECTION, uid), {
    savedPropertyIds: arrayRemove(propertyId),
  });
}
