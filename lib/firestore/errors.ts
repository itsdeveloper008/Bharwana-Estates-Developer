/** Shared timeout for client-side Firestore / Storage writes (avoids infinite "Sending…"). */
export const FIRESTORE_WRITE_TIMEOUT_MS = 20_000;

export function firestoreErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (code === "permission-denied") {
      return "Permission denied — check Firestore security rules for this collection.";
    }
    if (code === "unavailable") {
      return "Firestore is temporarily unavailable. Try again in a moment.";
    }
    return `${fallback} (${code})`;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
