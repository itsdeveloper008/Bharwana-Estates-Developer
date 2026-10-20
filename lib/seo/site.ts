import { SITE_EMAIL, SITE_OFFICE_ADDRESS, SITE_PHONE_E164, SITE_SOCIAL } from "@/lib/site-contact";

/** Canonical production origin (apex). */
export const SITE_ORIGIN = (
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://bharwanaestates.com"
).replace(/^https?:\/\/www\./, "https://");

export const SITE_NAME = "Bharwana Estates";

export const DEFAULT_OG_IMAGE = "/og-default.png";

export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}

export function organizationSameAs(): string[] {
  return Object.values(SITE_SOCIAL).filter((href) => Boolean(href));
}

export const ORGANIZATION = {
  name: SITE_NAME,
  url: SITE_ORIGIN,
  telephone: SITE_PHONE_E164,
  email: SITE_EMAIL,
  address: SITE_OFFICE_ADDRESS,
  logo: absoluteUrl("/logo.png"),
  sameAs: organizationSameAs(),
  areaServed: "Multan",
} as const;
