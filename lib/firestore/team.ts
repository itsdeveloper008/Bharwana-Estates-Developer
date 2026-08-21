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
import { teamMembers as seedTeam, type TeamMember } from "@/lib/mock-data/team";

const COLLECTION = "teamMembers";

export type TeamMemberInput = Omit<TeamMember, "id">;

export interface TeamMemberDoc extends TeamMember {
  sortOrder: number;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function mapDoc(id: string, data: Record<string, unknown>): TeamMemberDoc {
  const seed = seedTeam.find((member) => member.id === id);
  const mapped: TeamMemberDoc = {
    id,
    fullName: String(data.fullName ?? seed?.fullName ?? ""),
    role: String(data.role ?? seed?.role ?? ""),
    bio: String(data.bio ?? seed?.bio ?? ""),
    photoUrl: (() => {
      const fromData = data.photoUrl != null ? String(data.photoUrl) : "";
      const fromSeed = seed?.photoUrl ?? "";
      // Prefer updated seed cutouts over older local /team paths still stored in Firestore
      if (
        fromSeed.includes("-cutout") &&
        fromData.startsWith("/team/") &&
        !fromData.includes("-cutout")
      ) {
        return fromSeed;
      }
      return fromData || fromSeed || "";
    })(),
    linkedinUrl: data.linkedinUrl ? String(data.linkedinUrl) : seed?.linkedinUrl,
    email: data.email ? String(data.email) : seed?.email,
    phone: data.phone ? String(data.phone) : seed?.phone,
    location: data.location ? String(data.location) : seed?.location,
    department: data.department ? String(data.department) : seed?.department,
    yearsExperience:
      typeof data.yearsExperience === "number"
        ? data.yearsExperience
        : seed?.yearsExperience,
    quote: data.quote ? String(data.quote) : seed?.quote,
    about: String(data.about ?? seed?.about ?? ""),
    expertise: asStringArray(data.expertise).length
      ? asStringArray(data.expertise)
      : seed?.expertise ?? [],
    responsibilities: asStringArray(data.responsibilities).length
      ? asStringArray(data.responsibilities)
      : seed?.responsibilities ?? [],
    highlights: asStringArray(data.highlights).length
      ? asStringArray(data.highlights)
      : seed?.highlights ?? [],
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
  };
  return mapped;
}

function toFirestorePayload(member: TeamMemberInput, sortOrder: number) {
  return {
    fullName: member.fullName,
    role: member.role,
    bio: member.bio,
    photoUrl: member.photoUrl,
    linkedinUrl: member.linkedinUrl ?? null,
    email: member.email ?? null,
    phone: member.phone ?? null,
    location: member.location ?? null,
    department: member.department ?? null,
    yearsExperience: member.yearsExperience ?? null,
    quote: member.quote ?? null,
    about: member.about ?? "",
    expertise: member.expertise ?? [],
    responsibilities: member.responsibilities ?? [],
    highlights: member.highlights ?? [],
    sortOrder,
    updatedAt: new Date().toISOString(),
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
  await setDoc(doc(db, COLLECTION, id), toFirestorePayload(input, sortOrder), { merge: true });
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

export async function seedTeamMembers(members: TeamMember[], force = false): Promise<number> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured");

  const existing = await getDocs(collection(db, COLLECTION));
  if (!existing.empty && !force) return 0;

  const batch = writeBatch(db);
  members.forEach((member, index) => {
    batch.set(doc(db, COLLECTION, member.id), toFirestorePayload(member, index));
  });
  await batch.commit();
  return members.length;
}

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
