/**
 * Single source for public contact details (footer, FAQ, SEO).
 * Keep phone/email in sync with navbar CALL US / WhatsApp float.
 */

export const SITE_PHONE_DISPLAY = "+92 300 1713811";
export const SITE_PHONE_E164 = "+923001713811";
export const SITE_EMAIL = "info@bharwanaestate.com";

/** Postal / office lines for <address> blocks (order preserved). */
export const SITE_OFFICE_ADDRESS_LINES = [
  "House #F698, Buch Villas Phase 2",
  "Multan, Pakistan, 60000",
] as const;

/** Single-line form for structured data / plain text. */
export const SITE_OFFICE_ADDRESS =
  "House #F698, Buch Villas Phase 2, Multan, Pakistan, 60000";

/**
 * Footer social profiles. Empty string keeps the icon disabled until a URL is set.
 */
export const SITE_SOCIAL = {
  facebook: "https://www.facebook.com/share/1Hnf1jSJ7q/?mibextid=wwXIfr",
  instagram: "https://www.instagram.com/bharwanaestates",
  linkedin: "https://www.linkedin.com/company/bharwana-estates-developer/",
  youtube: "https://www.youtube.com/@bharwanaestates",
  tiktok: "",
} as const;
