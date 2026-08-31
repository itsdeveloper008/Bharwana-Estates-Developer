/** Normalize Pakistani / international input to E.164 for Firebase Phone Auth. */
export function normalizePhoneE164(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
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
