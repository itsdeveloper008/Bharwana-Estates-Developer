import imageCompression from "browser-image-compression";

/** Hard cap for listing photographs (create + edit). */
export const MAX_PROPERTY_PHOTOS = 10;

/** Longest edge after resize — enough for web listings, cuts multi‑MB originals. */
export const LISTING_IMAGE_MAX_EDGE = 2200;

/** JPEG quality ~80–85%: large size savings without obvious visual loss. */
export const LISTING_IMAGE_QUALITY = 0.85;

/** Soft target size after compression (library may stop early if already smaller). */
export const LISTING_IMAGE_MAX_MB = 1.6;

/**
 * Compress a listing photo client-side (Web Worker when available) before Storage upload.
 * Preserves aspect ratio; outputs JPEG.
 */
export async function compressListingImage(input: File | Blob, fileName = "photo.jpg"): Promise<File> {
  const source =
    input instanceof File
      ? input
      : new File([input], fileName, { type: input.type || "image/jpeg" });

  try {
    const compressed = await imageCompression(source, {
      maxSizeMB: LISTING_IMAGE_MAX_MB,
      maxWidthOrHeight: LISTING_IMAGE_MAX_EDGE,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: LISTING_IMAGE_QUALITY,
      // Avoid upscaling tiny images.
      alwaysKeepResolution: false,
    });

    const blob = compressed instanceof Blob ? compressed : source;
    const name = source.name.replace(/\.\w+$/i, "") || "photo";
    return new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (error) {
    // HEIC / odd formats: fall back to canvas path below.
    console.warn("[compressListingImage] browser-image-compression failed, trying canvas", error);
    return canvasCompressFallback(source);
  }
}

async function canvasCompressFallback(file: File): Promise<File> {
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") {
    return file;
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, LISTING_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), "image/jpeg", LISTING_IMAGE_QUALITY);
    });
    if (!blob?.size) return file;
    const name = file.name.replace(/\.\w+$/i, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
