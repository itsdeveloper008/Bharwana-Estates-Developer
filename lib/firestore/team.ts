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

/** Reject expired blob previews and other non-loadable photo values. */
function isUsableTeamPhotoUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:")) return false;
  return (
    url.startsWith("/") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  );
}

function resolveSeed(id: string, data: Record<string, unknown>) {
  const byId = seedTeam.find((member) => member.id === id);
  if (byId) return byId;
  // Legacy Firestore docs still named Talal after the MD role moved to Iqra.
  if (String(data.fullName ?? "") === "Talal Mirza") {
    return seedTeam.find((member) => member.id === "team-talal");
  }
  return undefined;
}

function resolvePhotoUrl(
  id: string,
  fromData: string,
  fromSeed: string,
  forceSeedPhoto = false,
): string {
  // Local /team assets were migrated to WebP.
  const normalizedLocal = fromData.startsWith("/team/")
    ? fromData.replace(/\.(jpe?g|png)$/i, ".webp")
    : fromData;

  if (forceSeedPhoto && fromSeed.startsWith("/team/")) {
    return fromSeed;
  }

  // Managing-director seed slot: keep a working local headshot unless Admin
  // uploaded a fresh file to Storage (any team/{id}-*.webp path).
  if (id === "team-talal" && fromSeed.startsWith("/team/")) {
    const isFreshUpload =
      normalizedLocal.includes("firebasestorage.googleapis.com") ||
      normalizedLocal.includes("firebasestorage.app") ||
      normalizedLocal.includes(`team%2F${id}`) ||
      normalizedLocal.includes(`team/${id}`);
    const isCurrentLocal =
      normalizedLocal.startsWith("/team/") &&
      !normalizedLocal.includes("talal-mirza");
    if (isFreshUpload || isCurrentLocal) return normalizedLocal;
    return fromSeed;
  }

  if (
    fromSeed.startsWith("/team/") &&
    (!isUsableTeamPhotoUrl(fromData) ||
      fromData.includes("-cutout") ||
      /\.(jpe?g|png)$/i.test(fromData) ||
      fromData.includes("talal-mirza"))
  ) {
    return fromSeed;
  }

  if (normalizedLocal.startsWith("/team/")) return normalizedLocal;
  return isUsableTeamPhotoUrl(fromData) ? fromData : fromSeed || "";
}

function mapDoc(id: string, data: Record<string, unknown>): TeamMemberDoc {
  const seed = resolveSeed(id, data);
  const rawName = String(data.fullName ?? "");
  const fromDataPhoto = data.photoUrl != null ? String(data.photoUrl) : "";
  const fromSeedPhoto = seed?.photoUrl ?? "";

  // Firestore can still hold the old Talal profile — replace it with Iqra for display.
  if (seed && rawName === "Talal Mirza") {
    return {
      id,
      fullName: seed.fullName,
      role: String(data.role ?? seed.role),
      bio: seed.bio,
      photoUrl: resolvePhotoUrl(id, fromDataPhoto, fromSeedPhoto, true),
      linkedinUrl: data.linkedinUrl ? String(data.linkedinUrl) : seed.linkedinUrl,
      email: seed.email,
      phone: data.phone ? String(data.phone) : seed.phone,
      location: data.location ? String(data.location) : seed.location,
      department: data.department ? String(data.department) : seed.department,
      yearsExperience:
        typeof data.yearsExperience === "number"
          ? data.yearsExperience
          : seed.yearsExperience,
      quote: seed.quote,
      about: seed.about,
      expertise: seed.expertise,
      responsibilities: seed.responsibilities,
      highlights: seed.highlights,
      sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    };
  }

  return {
    id,
    fullName: rawName || seed?.fullName || "",
    role: String(data.role ?? seed?.role ?? ""),
    bio: String(data.bio ?? seed?.bio ?? ""),
    photoUrl: resolvePhotoUrl(id, fromDataPhoto, fromSeedPhoto),
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

/**
 * Rewrite legacy "Talal Mirza" Firestore docs (and broken MD photos) to the
 * current Iqra seed. Safe to call from the client — no-ops without team write access.
 */
export async function repairStaleTalalTeamDocs(): Promise<number> {
  const db = getDb();
  if (!db) return 0;
  const seed = seedTeam.find((member) => member.id === "team-talal");
  if (!seed) return 0;

  const snap = await getDocs(collection(db, COLLECTION));
  let repaired = 0;

  for (const item of snap.docs) {
    const data = item.data() as Record<string, unknown>;
    const name = String(data.fullName ?? "");
    const photo = data.photoUrl != null ? String(data.photoUrl) : "";
    const isLegacyName = name === "Talal Mirza";
    const isMdSeat = item.id === "team-talal";
    const photoBroken =
      !photo ||
      photo.startsWith("blob:") ||
      photo.startsWith("data:") ||
      photo.includes("talal-mirza") ||
      /\.(jpe?g|png)$/i.test(photo);

    if (!isLegacyName && !(isMdSeat && photoBroken)) continue;

    await setDoc(
      doc(db, COLLECTION, item.id),
      {
        ...(isLegacyName
          ? {
              fullName: seed.fullName,
              bio: seed.bio,
              about: seed.about,
              quote: seed.quote ?? null,
              email: seed.email ?? null,
              expertise: seed.expertise,
              responsibilities: seed.responsibilities,
              highlights: seed.highlights,
              role: data.role ?? seed.role,
            }
          : {}),
        ...(photoBroken || isLegacyName ? { photoUrl: seed.photoUrl } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    repaired += 1;
  }

  return repaired;
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
  if (!response.ok) {
    throw new Error("Could not read the selected team photo");
  }
  const blob = await response.blob();
  // Unique path so browsers/CDN do not keep showing the previous headshot.
  const storageRef = ref(storage, `team/${memberId}-${Date.now()}.webp`);
  await uploadBytes(storageRef, blob, { contentType: "image/webp" });
  return getDownloadURL(storageRef);
}
