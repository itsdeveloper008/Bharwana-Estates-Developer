import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { FIRESTORE_WRITE_TIMEOUT_MS } from "@/lib/firestore/errors";
import type { Inquiry, InquiryChannel, InquiryStatus } from "@/lib/types";
import { withTimeout } from "@/lib/utils";

const COLLECTION = "inquiries";

// TODO: Configure Firestore security rules before production.
// Open read/write is fine for local demos only — lock down inquiries to authenticated admins/sales.

function mapInquiry(id: string, data: Record<string, unknown>): Inquiry {
  const createdAt = data.createdAt;
  let createdIso = new Date().toISOString();
  if (typeof createdAt === "string") {
    createdIso = createdAt;
  } else if (createdAt && typeof createdAt === "object" && "toDate" in createdAt) {
    createdIso = (createdAt as { toDate: () => Date }).toDate().toISOString();
  }

  return {
    id,
    propertyId: String(data.propertyId ?? ""),
    buyerId: String(data.buyerId ?? ""),
    assignedSalesId: data.assignedSalesId ? String(data.assignedSalesId) : undefined,
    status: (data.status as InquiryStatus) ?? "NEW",
    channel: (data.channel as InquiryChannel) ?? "PLATFORM_ASSISTED",
    notes: String(data.notes ?? ""),
    createdAt: createdIso,
  };
}

export type InquiryInput = {
  propertyId: string;
  buyerId: string;
  channel: InquiryChannel;
  notes: string;
  status?: InquiryStatus;
  assignedSalesId?: string;
};

export async function createInquiry(input: InquiryInput): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* env vars.");

  const createdAt = new Date().toISOString();
  const ref = await withTimeout(
    addDoc(collection(db, COLLECTION), {
      propertyId: input.propertyId,
      buyerId: input.buyerId,
      channel: input.channel,
      notes: input.notes,
      status: input.status ?? "NEW",
      assignedSalesId: input.assignedSalesId ?? null,
      createdAt,
    }),
    FIRESTORE_WRITE_TIMEOUT_MS,
    "Inquiry save",
  );
  return ref.id;
}

export function subscribeInquiries(
  onData: (inquiries: Inquiry[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe | null {
  const db = getDb();
  if (!db) return null;

  const q = collection(db, COLLECTION);
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((item) => mapInquiry(item.id, item.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(list);
    },
    (error) => onError?.(error),
  );
}

export async function updateInquiryStatusRemote(id: string, status: InquiryStatus): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await updateDoc(doc(db, COLLECTION, id), { status });
}

export async function deleteInquiry(id: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function createContactMessage(input: {
  name?: string;
  email: string;
  message?: string;
}): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  // TODO: Configure Firestore security rules before production.
  await addDoc(collection(db, "contactMessages"), {
    ...input,
    createdAt: serverTimestamp(),
  });
}

export async function createNewsletterSignup(email: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  // TODO: Configure Firestore security rules before production.
  await addDoc(collection(db, "newsletterSignups"), {
    email,
    createdAt: serverTimestamp(),
  });
}

export function inquiriesBackendReady() {
  return isFirebaseConfigured();
}
