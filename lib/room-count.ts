/** Room-count helpers for beds/baths dropdowns (1–10 + 10+). */

export const ROOM_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Numeric sentinel stored when the admin picks "10+". Keeps filters numeric. */
export const ROOM_COUNT_TEN_PLUS = 11;

export function roomCountToSelectValue(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "";
  if (value > 10) return "10+";
  return String(Math.trunc(value));
}

export function selectValueToRoomCount(value: string): number | undefined {
  if (!value) return undefined;
  if (value === "10+") return ROOM_COUNT_TEN_PLUS;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.trunc(n);
}

/** Display label for cards/detail (e.g. 12 → "10+"). */
export function formatRoomCount(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value > 10) return "10+";
  return String(Math.trunc(value));
}
