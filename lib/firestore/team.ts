import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getDb, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase/client";
import type { TeamMember } from "@/lib/mock-data/team";

const COLLECTION = "teamMembers";

export type TeamMemberInput = Omit<TeamMember, "id">;

export interface TeamMemberDoc extends TeamMember {
  sortOrder: number;
}

function mapDoc(id: string, data: Record<string, unknown>): TeamMemberDoc {
  return {
    id,
    fullName: String(data.fullName ?? ""),
    role: String(data.role ?? ""),
    bio: String(data.bio ?? ""),
    photoUrl: String(data.photoUrl ?? ""),
    linkedinUrl: data.linkedinUrl ? String(data.linkedinUrl) : undefined,
    email: data.email ? String(data.email) : undefined,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
  };
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COLLECTION), orderBy("sortOrder", "asc")));
  return snap.docs.map((item) => mapDoc(item.id, item.data()));
}

export function subscribeTeamMembers(
  onData: (members: TeamMember[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe | null {
  const db = getDb();
  if (!db) return null;

  return onSnapshot(
    query(collection(db, COLLECTION), orderBy("sortOrder", "asc")),
    (snap) => {
      onData(snap.docs.map((item) => mapDoc(item.id, item.data())));
    },
    (error) => onError?.(error),
  );
}

export async function upsertTeamMember(
  id: string,
  input: TeamMemberInput,
  sortOrder: number,
): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  await setDoc(
    doc(db, COLLECTION, id),
    {
      fullName: input.fullName,
      role: input.role,
      bio: input.bio,
      photoUrl: input.photoUrl,
      linkedinUrl: input.linkedinUrl ?? null,
      email: input.email ?? null,
      sortOrder,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function deleteTeamMember(id: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function reorderTeamMembers(orderedIds: string[]): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.set(doc(db, COLLECTION, id), { sortOrder: index }, { merge: true });
  });
  await batch.commit();
}

export async function seedTeamMembers(members: TeamMember[]): Promise<number> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  const existing = await getDocs(collection(db, COLLECTION));
  if (!existing.empty) return 0;

  const batch = writeBatch(db);
  members.forEach((member, index) => {
    batch.set(doc(db, COLLECTION, member.id), {
      fullName: member.fullName,
      role: member.role,
      bio: member.bio,
      photoUrl: member.photoUrl,
      linkedinUrl: member.linkedinUrl ?? null,
      email: member.email ?? null,
      sortOrder: index,
      updatedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
  return members.length;
}

/** Upload blob:/data: previews (or File) to Firebase Storage; leave http(s)/relative paths as-is. */
export async function resolveTeamPhotoUrl(
  memberId: string,
  photoUrl: string,
): Promise<string> {
  if (!photoUrl) return photoUrl;
  if (photoUrl.startsWith("/") || photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    return photoUrl;
  }

  const storage = getFirebaseStorage();
  if (!storage || !isFirebaseConfigured()) {
    throw new Error("Firebase Storage is not configured for photo uploads");
  }

  const response = await fetch(photoUrl);
  const blob = await response.blob();
  const extension = blob.type.includes("png") ? "png" : "jpg";
  const storageRef = ref(storage, `team/${memberId}.${extension}`);
  await uploadBytes(storageRef, blob, { contentType: blob.type || "image/jpeg" });
  return getDownloadURL(storageRef);
}
