/** YouTube URL → video ID helpers. Store only the 11-char ID in Firestore. */

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function isAllowedHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  if (ALLOWED_HOSTS.has(host)) return true;
  // Subdomains like music.youtube.com already listed; allow *.youtube.com / *.youtu.be
  return host.endsWith(".youtube.com") || host.endsWith(".youtu.be") || host.endsWith(".youtube-nocookie.com");
}

function idFromPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  // /watch is handled via query; /embed/ID, /shorts/ID, /live/ID, /v/ID
  const kind = parts[0]?.toLowerCase();
  if (kind === "embed" || kind === "shorts" || kind === "live" || kind === "v") {
    const id = parts[1] ?? "";
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }
  // youtu.be/ID
  if (parts.length === 1 && YOUTUBE_ID_RE.test(parts[0]!)) return parts[0]!;
  return null;
}

/**
 * Extract a YouTube video ID from a URL or bare ID.
 * Returns null for empty, invalid host, or non-11-char IDs.
 */
export function extractYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  if (YOUTUBE_ID_RE.test(raw)) return raw;

  // Reject obvious non-http schemes before URL parse
  if (/^(javascript|data|file|blob):/i.test(raw)) return null;

  let url: URL;
  try {
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`;
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!isAllowedHost(url.hostname)) return null;

  const fromQuery = url.searchParams.get("v")?.trim() ?? "";
  if (YOUTUBE_ID_RE.test(fromQuery)) return fromQuery;

  return idFromPath(url.pathname);
}

export function getThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function getWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function getEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
}

export function isYouTubeVideoId(value: unknown): value is string {
  return typeof value === "string" && YOUTUBE_ID_RE.test(value);
}
