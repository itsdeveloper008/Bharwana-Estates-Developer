/** Synthetic emails used for phone-only Firebase Auth accounts — never show in UI. */
const SYNTHETIC_PHONE_EMAIL_SUFFIX = "@phone.bharwana.local";

export function isSyntheticPhoneEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(SYNTHETIC_PHONE_EMAIL_SUFFIX);
}

/** Real email for display, or null when the account only has a synthetic phone placeholder. */
export function displayUserEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim() ?? "";
  if (!trimmed || isSyntheticPhoneEmail(trimmed)) return null;
  return trimmed;
}
