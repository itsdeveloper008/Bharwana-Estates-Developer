/** Truncate for UI; full string can stay on title/tooltip. */
export function truncateText(value: string, max = 72): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}
