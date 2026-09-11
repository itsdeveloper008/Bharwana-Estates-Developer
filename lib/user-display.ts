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

/**
 * Map a login identifier (real email or Pakistan mobile) to the Auth email.
 * Phone-only accounts store password on `{digits}@phone.bharwana.local`.
 */
export function authEmailFromLoginIdentifier(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;
  else if (!digits.startsWith("92") && digits.length >= 10) digits = `92${digits.slice(-10)}`;

  if (digits.length >= 12 && digits.startsWith("92")) {
    return `${digits}@phone.bharwana.local`;
  }
  return trimmed;
}
