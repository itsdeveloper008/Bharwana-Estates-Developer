import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";

/** Wrong codes allowed before the phone number or email is locked. */
export const MAX_CODE_TRIES = 3;
/** How long a locked phone number or email stays locked. */
export const CODE_LOCK_MS = 2 * 60 * 60 * 1000;

export type GuardState = { blockedUntil: number | null; triesLeft: number };

/** Phone numbers as E.164, emails lower-cased, so one person maps to one record. */
export function guardTarget(raw: string): string | null {
  const value = String(raw ?? "").trim().toLowerCase();
  if (/^\+923\d{9}$/.test(value)) return value;
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(value)) return value;
  return null;
}

function ref(target: string) {
  const id = createHash("sha256").update(target).digest("hex");
  return getAdminDb().collection("authCodeGuards").doc(id);
}

export async function guardState(target: string): Promise<GuardState> {
  const snap = await ref(target).get();
  const blockedUntil = Number(snap.get("blockedUntil") ?? 0);
  if (blockedUntil > Date.now()) return { blockedUntil, triesLeft: 0 };
  const fails = blockedUntil ? 0 : Number(snap.get("fails") ?? 0);
  return { blockedUntil: null, triesLeft: Math.max(0, MAX_CODE_TRIES - fails) };
}

/** Counts one wrong code; the third in a row locks the target for two hours. */
export async function recordWrongCode(target: string): Promise<GuardState> {
  const doc = ref(target);
  return getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(doc);
    const now = Date.now();
    const lockedUntil = Number(snap.get("blockedUntil") ?? 0);
    if (lockedUntil > now) return { blockedUntil: lockedUntil, triesLeft: 0 };
    // An expired lock starts a fresh count.
    const fails = (lockedUntil ? 0 : Number(snap.get("fails") ?? 0)) + 1;
    if (fails >= MAX_CODE_TRIES) {
      const blockedUntil = now + CODE_LOCK_MS;
      tx.set(doc, { fails: 0, blockedUntil, updatedAt: now });
      return { blockedUntil, triesLeft: 0 };
    }
    tx.set(doc, { fails, blockedUntil: 0, updatedAt: now });
    return { blockedUntil: null, triesLeft: MAX_CODE_TRIES - fails };
  });
}

export async function clearWrongCodes(target: string): Promise<void> {
  await ref(target).delete();
}

export function lockedMessage(blockedUntil: number): string {
  const minutes = Math.max(1, Math.ceil((blockedUntil - Date.now()) / 60000));
  const wait =
    minutes >= 60
      ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim()
      : `${minutes} min`;
  return `Too many wrong codes. Try again in ${wait}.`;
}
