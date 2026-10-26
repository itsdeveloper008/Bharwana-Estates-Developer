import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";
import { getAdminDb, getFirebaseAdminApp } from "@/lib/firebase/admin";
import { propertyCoverImage } from "@/lib/property-images";

/** Card covers render at most ~33vw on desktop; 960px covers retina without shipping the 2200px original. */
const THUMB_WIDTH = 960;
const THUMB_QUALITY = 72;

/** Watermark covers 45% of the photo's shorter edge, centred, at 55% of the logo's own opacity. */
const WATERMARK_SCALE = 0.45;
const WATERMARK_OPACITY = 0.55;
/**
 * Bump the version when the watermark look changes: photos with an older prefix are
 * re-stamped from their original (recorded in `watermarkedFrom`), never stamped twice.
 */
const WATERMARKED_PREFIX = "wm2-";
const ANY_WATERMARK_PREFIX = /^wm\d*-/;

let watermarkPng: Buffer | null = null;
function watermark(): Buffer {
  watermarkPng ??= readFileSync(path.join(process.cwd(), "lib/server/assets/watermark.png"));
  return watermarkPng;
}

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

/** Return `photo` with the Bharwana watermark composited in the centre (WebP). */
export async function watermarkPhoto(photo: Buffer): Promise<Buffer> {
  const base = sharp(photo).rotate();
  const { width = 0, height = 0 } = await base.clone().metadata().then(async (meta) => {
    // `.rotate()` swaps edges for EXIF-rotated photos.
    const swap = (meta.orientation ?? 1) >= 5;
    return swap ? { width: meta.height, height: meta.width } : meta;
  });
  const size = Math.max(1, Math.round(Math.min(width, height) * WATERMARK_SCALE));
  const mark = await sharp(watermark())
    .resize({ width: size, height: size, fit: "inside" })
    .ensureAlpha()
    .linear([1, 1, 1, WATERMARK_OPACITY], [0, 0, 0, 0])
    .png()
    .toBuffer();
  return base.composite([{ input: mark, gravity: "centre" }]).webp({ quality: 82 }).toBuffer();
}

function isWatermarkedPath(objectPath: string): boolean {
  return path.posix.basename(objectPath).startsWith(WATERMARKED_PREFIX);
}

/**
 * Replace every not-yet-watermarked Storage photo on `properties/{id}` with a watermarked copy.
 * Originals stay in Storage (unreferenced) so the change can be reverted. Returns photos replaced.
 */
export async function ensureWatermarked(id: string): Promise<number> {
  const ref = getAdminDb().collection("properties").doc(id);
  const snap = await ref.get();
  const images = Array.isArray(snap.data()?.images) ? (snap.data()!.images as string[]) : [];

  let replaced = 0;
  const next: string[] = [];
  for (let index = 0; index < images.length; index++) {
    const url = images[index]!;
    const object = typeof url === "string" ? storageObjectFromUrl(url) : null;
    if (!object || isWatermarkedPath(object.path)) {
      next.push(url);
      continue;
    }
    const bucket = getStorage(getFirebaseAdminApp()).bucket(object.bucket);
    let sourcePath = object.path;
    if (ANY_WATERMARK_PREFIX.test(path.posix.basename(object.path))) {
      // Older watermark style: re-stamp from the untouched original.
      const [meta] = await bucket.file(object.path).getMetadata();
      const from = meta.metadata?.watermarkedFrom;
      if (typeof from !== "string" || !from) {
        next.push(url);
        continue;
      }
      sourcePath = from;
    }
    const [original] = await bucket.file(sourcePath).download();
    const marked = await watermarkPhoto(original);
    const token = randomUUID();
    const markedPath = `${path.posix.dirname(object.path)}/${WATERMARKED_PREFIX}${index}-${Date.now()}.webp`;
    await bucket.file(markedPath).save(marked, {
      resumable: false,
      metadata: {
        contentType: "image/webp",
        cacheControl: IMMUTABLE_CACHE,
        metadata: { firebaseStorageDownloadTokens: token, watermarkedFrom: sourcePath },
      },
    });
    next.push(downloadUrl(object.bucket, markedPath, token));
    replaced++;
  }

  if (replaced > 0) {
    // Only swap URLs we processed; a concurrent edit that changed the list wins.
    await getAdminDb().runTransaction(async (tx) => {
      const fresh = await tx.get(ref);
      const current = fresh.data()?.images;
      if (JSON.stringify(current) !== JSON.stringify(images)) return;
      tx.update(ref, { images: next });
    });
  }
  return replaced;
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
