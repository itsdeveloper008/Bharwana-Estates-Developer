/** Pakistan mobile (+92) helpers for auth and contact forms. */

export const PK_COUNTRY_DIAL = "+92";
export const PK_MOBILE_LOCAL_LENGTH = 10;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Normalize any pasted/typed value to the 10-digit national mobile portion
 * (e.g. "3001234567"), stripping +92 / leading 0 and capping length.
 */
export function toPakistanMobileLocal(raw: string): string {
  let digits = digitsOnly(raw);
  if (digits.startsWith("92")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, PK_MOBILE_LOCAL_LENGTH);
}

/** Build E.164 for storage / Firebase Auth, e.g. "+923001234567". */
export function formatPakistanMobileE164(localDigits: string): string {
  return `${PK_COUNTRY_DIAL}${digitsOnly(localDigits).slice(0, PK_MOBILE_LOCAL_LENGTH)}`;
}

export function isValidPakistanMobileLocal(local: string): boolean {
  return /^3\d{9}$/.test(digitsOnly(local));
}

/** Normalize Pakistani / international input to E.164 for Firebase Phone Auth. */
export function normalizePhoneE164(raw: string): string {
  const trimmed = raw.trim();
  const digits = digitsOnly(trimmed);
  if (!digits) return "";

  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.startsWith("92")) {
    return `+${digits}`;
  }
  if (digits.startsWith("0")) {
    return `+92${digits.slice(1)}`;
  }
  return `+92${digits}`;
}

export function isValidPhoneE164(phone: string): boolean {
  return /^\+[1-9]\d{9,14}$/.test(phone);
}
