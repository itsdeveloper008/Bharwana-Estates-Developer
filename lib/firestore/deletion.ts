import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { FIRESTORE_WRITE_TIMEOUT_MS } from "@/lib/firestore/errors";
import { deleteUserDoc } from "@/lib/firestore/users";
import type { Developer, Inquiry, InquiryStatus, Property, PropertyStatus, UserRole } from "@/lib/types";
import { withTimeout } from "@/lib/utils";

export const RETENTION_DAYS = {
  REJECTED_PROPERTY: 90,
  CLOSED_LOST_INQUIRY: 180,
  STALE_NEW_INQUIRY: 60,
  PENDING_DEALER: 30,
} as const;

export type DeletionRequestStatus = "PENDING" | "PROCESSED" | "CANCELLED";

export type DeletionRequest = {
  id: string;
  uid: string;
  email: string;
  fullName: string;
  role: UserRole | string;
  status: DeletionRequestStatus;
  createdAt: string;
  note?: string;
};

export type CleanupPreview = {
  rejectedProperties: { id: string; title: string; createdAt: string }[];
  closedLostInquiries: { id: string; createdAt: string }[];
  staleNewInquiries: { id: string; createdAt: string }[];
  pendingDealers: { id: string; companyName: string; createdAt?: string }[];
};

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function createdAtIso(data: Record<string, unknown>): string {
  const createdAt = data.createdAt;
  if (typeof createdAt === "string") return createdAt;
  if (createdAt && typeof createdAt === "object" && "toDate" in createdAt) {
    return (createdAt as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date(0).toISOString();
}

function mapDeletionRequest(id: string, data: Record<string, unknown>): DeletionRequest {
  return {
    id,
    uid: String(data.uid ?? ""),
    email: String(data.email ?? ""),
    fullName: String(data.fullName ?? ""),
    role: String(data.role ?? "BUYER"),
    status: (data.status as DeletionRequestStatus) ?? "PENDING",
    createdAt: createdAtIso(data),
    note: data.note ? String(data.note) : undefined,
  };
}

/** Remove Firestore data owned by the user. Commission/transaction docs are flagged, not wiped. */
export async function purgeUserOwnedData(uid: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  const [propertySnap, inquirySnap, developerSnap, transactionSnap] = await Promise.all([
    getDocs(collection(db, "properties")),
    getDocs(collection(db, "inquiries")),
    getDocs(collection(db, "developers")).catch(() => null),
    getDocs(collection(db, "transactions")).catch(() => null),
  ]);

  const propertyDeletes = propertySnap.docs
    .filter((item) => String(item.data().ownerUserId ?? "") === uid)
    .map((item) => deleteDoc(item.ref));

  const inquiryDeletes = inquirySnap.docs
    .filter((item) => String(item.data().buyerId ?? "") === uid)
    .map((item) => deleteDoc(item.ref));

  const developerIds: string[] = [];
  const developerUpdates =
    developerSnap?.docs
      .filter((item) => String(item.data().dealerUserId ?? "") === uid)
      .map((item) => {
        developerIds.push(item.id);
        return updateDoc(item.ref, { accountDeleted: true, dealerUserId: null });
      }) ?? [];

  const transactionUpdates =
    transactionSnap?.docs
      .filter((item) => developerIds.includes(String(item.data().developerId ?? "")))
      .map((item) => updateDoc(item.ref, { dealerDeleted: true })) ?? [];

  await Promise.all([...propertyDeletes, ...inquiryDeletes, ...developerUpdates, ...transactionUpdates]);
  await deleteUserDoc(uid);
}

export async function createDeletionRequest(input: {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole | string;
  note?: string;
}): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  const createdAt = new Date().toISOString();
  const ref = await withTimeout(
    addDoc(collection(db, "deletionRequests"), {
      uid: input.uid,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      role: input.role,
      status: "PENDING",
      note: input.note?.trim() || null,
      createdAt,
      createdAtServer: serverTimestamp(),
    }),
    FIRESTORE_WRITE_TIMEOUT_MS,
    "Deletion request",
  );
  return ref.id;
}

export function subscribeDeletionRequests(
  onData: (requests: DeletionRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe | null {
  const db = getDb();
  if (!db) return null;

  return onSnapshot(
    collection(db, "deletionRequests"),
    (snap) => {
      const list = snap.docs
        .map((item) => mapDeletionRequest(item.id, item.data()))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      onData(list);
    },
    (error) => onError?.(error),
  );
}

export async function updateDeletionRequestStatus(
  id: string,
  status: DeletionRequestStatus,
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await updateDoc(doc(db, "deletionRequests", id), { status });
}

export async function previewRetentionCleanup(options?: {
  developers?: Developer[];
}): Promise<CleanupPreview> {
  const db = getDb();
  if (!db) {
    return {
      rejectedProperties: [],
      closedLostInquiries: [],
      staleNewInquiries: [],
      pendingDealers: flagPendingDealers(options?.developers ?? []),
    };
  }

  const rejectedCutoff = daysAgoIso(RETENTION_DAYS.REJECTED_PROPERTY);
  const closedLostCutoff = daysAgoIso(RETENTION_DAYS.CLOSED_LOST_INQUIRY);
  const staleNewCutoff = daysAgoIso(RETENTION_DAYS.STALE_NEW_INQUIRY);

  const [propertySnap, inquirySnap] = await Promise.all([
    getDocs(collection(db, "properties")),
    getDocs(collection(db, "inquiries")),
  ]);

  const rejectedProperties = propertySnap.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        title: String(data.title ?? "Untitled"),
        status: (data.status as PropertyStatus) ?? "DRAFT",
        createdAt: createdAtIso(data),
      };
    })
    .filter((item) => item.status === "REJECTED" && item.createdAt <= rejectedCutoff)
    .map(({ id, title, createdAt }) => ({ id, title, createdAt }));

  const inquiries = inquirySnap.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id,
      status: (data.status as InquiryStatus) ?? "NEW",
      createdAt: createdAtIso(data),
    };
  });

  const closedLostInquiries = inquiries
    .filter((item) => item.status === "CLOSED_LOST" && item.createdAt <= closedLostCutoff)
    .map(({ id, createdAt }) => ({ id, createdAt }));

  const staleNewInquiries = inquiries
    .filter((item) => item.status === "NEW" && item.createdAt <= staleNewCutoff)
    .map(({ id, createdAt }) => ({ id, createdAt }));

  return {
    rejectedProperties,
    closedLostInquiries,
    staleNewInquiries,
    pendingDealers: flagPendingDealers(options?.developers ?? []),
  };
}

function flagPendingDealers(developers: Developer[]) {
  const cutoff = daysAgoIso(RETENTION_DAYS.PENDING_DEALER);
  return developers
    .filter((developer) => {
      if (developer.status !== "PENDING_REVIEW" || developer.accountDeleted) return false;
      // Developers may not have createdAt in the type — treat missing as not stale
      const created = (developer as Developer & { createdAt?: string }).createdAt;
      return created ? created <= cutoff : false;
    })
    .map((developer) => ({
      id: developer.id,
      companyName: developer.companyName,
      createdAt: (developer as Developer & { createdAt?: string }).createdAt,
    }));
}

/** Deletes stale REJECTED properties and CLOSED_LOST inquiries. Flags are returned, not deleted. */
export async function runRetentionCleanup(): Promise<{
  deletedProperties: number;
  deletedInquiries: number;
}> {
  const preview = await previewRetentionCleanup();
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  await Promise.all([
    ...preview.rejectedProperties.map((item) => deleteDoc(doc(db, "properties", item.id))),
    ...preview.closedLostInquiries.map((item) => deleteDoc(doc(db, "inquiries", item.id))),
  ]);

  return {
    deletedProperties: preview.rejectedProperties.length,
    deletedInquiries: preview.closedLostInquiries.length,
  };
}

/** Build a cleanup preview from in-memory lists (mock / hybrid Admin view). */
export function previewRetentionCleanupFromLists(input: {
  properties: Property[];
  inquiries: Inquiry[];
  developers: Developer[];
}): CleanupPreview {
  const rejectedCutoff = daysAgoIso(RETENTION_DAYS.REJECTED_PROPERTY);
  const closedLostCutoff = daysAgoIso(RETENTION_DAYS.CLOSED_LOST_INQUIRY);
  const staleNewCutoff = daysAgoIso(RETENTION_DAYS.STALE_NEW_INQUIRY);

  return {
    rejectedProperties: input.properties
      .filter((item) => item.status === "REJECTED" && item.createdAt <= rejectedCutoff)
      .map((item) => ({ id: item.id, title: item.title, createdAt: item.createdAt })),
    closedLostInquiries: input.inquiries
      .filter((item) => item.status === "CLOSED_LOST" && item.createdAt <= closedLostCutoff)
      .map((item) => ({ id: item.id, createdAt: item.createdAt })),
    staleNewInquiries: input.inquiries
      .filter((item) => item.status === "NEW" && item.createdAt <= staleNewCutoff)
      .map((item) => ({ id: item.id, createdAt: item.createdAt })),
    pendingDealers: flagPendingDealers(input.developers),
  };
}
