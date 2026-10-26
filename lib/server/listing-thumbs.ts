import { randomUUID } from "node:crypto";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { getAdminDb, getFirebaseAdminApp } from "@/lib/firebase/admin";
import { propertyCoverImage } from "@/lib/property-images";

/** Card covers render at most ~33vw on desktop; 960px covers retina without shipping the 2200px original. */
const THUMB_WIDTH = 960;
const THUMB_QUALITY = 72;

/** Storage URLs are unique per upload (see resolvePropertyImages), so browsers may cache them forever. */
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

type StorageObjectRef = { bucket: string; path: string };

/** Parse `https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media&token=…`. */
export function storageObjectFromUrl(url: string): StorageObjectRef | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "firebasestorage.googleapis.com") return null;
    const match = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (!match) return null;
    return { bucket: match[1]!, path: decodeURIComponent(match[2]!) };
  } catch {
    return null;
  }
}

function downloadUrl(bucket: string, path: string, token: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/**
 * Make sure `properties/{id}` has a small `coverThumb` built from its current cover photo.
 * Idempotent: does nothing when the stored thumb already matches the cover.
 */
export async function ensureCoverThumb(id: string): Promise<"created" | "current" | "skipped"> {
  const db = getAdminDb();
  const ref = db.collection("properties").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return "skipped";

  const data = snap.data() ?? {};
  const cover = propertyCoverImage(Array.isArray(data.images) ? (data.images as string[]) : []);
  if (!cover) return "skipped";
  if (data.coverThumb && data.coverThumbSource === cover) return "current";

  const source = storageObjectFromUrl(cover);
  if (!source) return "skipped";

  const bucket = getStorage(getFirebaseAdminApp()).bucket(source.bucket);
  const [original] = await bucket.file(source.path).download();
  const thumb = await sharp(original)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();

  const token = randomUUID();
  const thumbPath = `thumbs/${id}/${Date.now()}.webp`;
  await bucket.file(thumbPath).save(thumb, {
    resumable: false,
    metadata: {
      contentType: "image/webp",
      cacheControl: IMMUTABLE_CACHE,
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });

  await ref.update({
    coverThumb: downloadUrl(source.bucket, thumbPath, token),
    coverThumbSource: cover,
  });
  return "created";
}

/** Set a long-lived Cache-Control on every listing photo of `properties/{id}`. Returns files updated. */
export async function cacheListingPhotos(id: string): Promise<number> {
  const snap = await getAdminDb().collection("properties").doc(id).get();
  const images = Array.isArray(snap.data()?.images) ? (snap.data()!.images as string[]) : [];
  let updated = 0;
  for (const url of images) {
    const object = typeof url === "string" ? storageObjectFromUrl(url) : null;
    if (!object) continue;
    const file = getStorage(getFirebaseAdminApp()).bucket(object.bucket).file(object.path);
    const [meta] = await file.getMetadata();
    if (meta.cacheControl === IMMUTABLE_CACHE) continue;
    await file.setMetadata({ cacheControl: IMMUTABLE_CACHE });
    updated++;
  }
  return updated;
}
