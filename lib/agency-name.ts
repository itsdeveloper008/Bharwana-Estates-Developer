/** Agency / company name helpers — letters, numbers, spaces, and common business punctuation. */

export const AGENCY_NAME_MAX_LENGTH = 80;
export const AGENCY_NAME_MIN_LENGTH = 2;

/** Letters, digits, spaces, and & - . ' */
const AGENCY_NAME_ALLOWED = /^[A-Za-z0-9]+(?:[ &.'-][A-Za-z0-9]+)*$/;

/** Keep letters, numbers, spaces, and common business punctuation; drop other symbols. */
export function sanitizeAgencyName(raw: string): string {
  return raw.replace(/[^A-Za-z0-9\s&.'-]/g, "");
}

export function normalizeAgencyName(raw: string): string {
  return sanitizeAgencyName(raw).replace(/\s+/g, " ").trim();
}

export function isValidAgencyName(value: string): boolean {
  const normalized = normalizeAgencyName(value);
  if (normalized.length < AGENCY_NAME_MIN_LENGTH) return false;
  if (normalized.length > AGENCY_NAME_MAX_LENGTH) return false;
  return AGENCY_NAME_ALLOWED.test(normalized);
}

export const AGENCY_NAME_MESSAGE =
  "Agency name can use letters, numbers, spaces, and & - . ' (max 80 characters)";
