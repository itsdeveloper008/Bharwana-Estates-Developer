import { NextResponse } from "next/server";

/**
 * Simple sliding-window limiter (BED-SEC-11 / BED-SEC-36).
 * In-memory only — good enough for a single Node process / warm serverless
 * instance. For multi-region prod, wire Upstash later via env (no package yet).
 */

const mem = new Map<string, number[]>();

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

export function phoneKey(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export async function limit(
  name: string,
  id: string,
  max: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfter: number }> {
  const key = `${name}:${id}`;
  const now = Date.now();
  const hits = (mem.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    const retryAfter = Math.max(1, Math.ceil((hits[0]! + windowMs - now) / 1000));
    return { ok: false, retryAfter };
  }
  hits.push(now);
  mem.set(key, hits);
  return { ok: true, retryAfter: 0 };
}

export function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: "Too many requests. Try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/** Run checks in order; return the first 429 response, or null if all pass. */
export async function enforce(
  checks: Array<[name: string, id: string, max: number, windowMs: number]>,
): Promise<NextResponse | null> {
  for (const [name, id, max, windowMs] of checks) {
    const result = await limit(name, id, max, windowMs);
    if (!result.ok) return tooMany(result.retryAfter);
  }
  return null;
}
