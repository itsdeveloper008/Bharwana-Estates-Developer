/** Shared timeout for client-side Firestore / Storage writes (avoids infinite "Sending…"). */
export const FIRESTORE_WRITE_TIMEOUT_MS = 20_000;

/** Listing photos can be several MB compressed — allow longer than a plain doc write. */
export const PHOTO_UPLOAD_TIMEOUT_MS = 90_000;

export function firestoreErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error) {
    const raw = String((error as { code?: string }).code);
    const code = raw.replace(/^firestore\//, "").replace(/^storage\//, "");
    const detail =
      "message" in error && typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : "";
    if (code === "permission-denied" || code === "unauthorized") {
      return "Permission denied. Check that you are signed in and Storage/Firestore rules allow this upload.";
    }
    if (code === "unavailable") {
      return "Firebase is temporarily unavailable. Try again in a moment.";
    }
    if (code === "invalid-argument") {
      const hint = detail ? ` ${detail}` : "";
      return `${fallback} (invalid data.${hint})`.trim();
    }
    if (detail) return `${fallback} (${raw}: ${detail})`;
    return `${fallback} (${raw})`;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
