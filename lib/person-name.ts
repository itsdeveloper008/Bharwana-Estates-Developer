/** Person “Full name” helpers — English letters + spaces only (digits/symbols stripped). */

export const FULL_NAME_MAX_LENGTH = 60;

/** Keep A–Z / a–z and spaces; drop digits, punctuation, and other symbols. */
export function sanitizePersonName(raw: string): string {
  return raw.replace(/[^A-Za-z\s]/g, "");
}

export function normalizePersonName(raw: string): string {
  return sanitizePersonName(raw).replace(/\s+/g, " ").trim();
}

export function isLettersAndSpacesOnly(value: string): boolean {
  return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(value.trim().replace(/\s+/g, " "));
}

export const PERSON_NAME_LETTERS_MESSAGE = "Name can only contain letters";
