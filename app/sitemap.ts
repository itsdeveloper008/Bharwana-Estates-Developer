import type { MetadataRoute } from "next";
import { SEO_LANDINGS, matchLandingProperties } from "@/content/seo-landings";
import { propertyPath } from "@/lib/seo/slug";
import { SITE_ORIGIN } from "@/lib/seo/site";
import {
  fetchPublicProperties,
  fetchSitemapProperties,
} from "@/lib/server/properties";

// Must be a literal for Next 16 static analysis; keep in sync with SEO_REVALIDATE_SECONDS.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/properties",
    "/about",
    "/team",
    "/faq",
    "/privacy",
    "/terms",
    "/cookies",
    "/disclaimer",
    "/deletion-policy",
  ].map((path) => ({
    url: `${SITE_ORIGIN}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/properties" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/properties" ? 0.9 : 0.6,
  }));

  const [published, allPublic] = await Promise.all([
    fetchSitemapProperties(),
    fetchPublicProperties(250),
  ]);

  const landings: MetadataRoute.Sitemap = SEO_LANDINGS.filter(
    (landing) => matchLandingProperties(allPublic, landing.filter).length > 0,
  ).map((landing) => ({
    url: `${SITE_ORIGIN}/${landing.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const properties: MetadataRoute.Sitemap = published.map((row) => ({
    url: `${SITE_ORIGIN}${propertyPath({ id: row.id, title: row.title, city: row.city })}`,
    lastModified: new Date(row.lastModified),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...landings, ...properties];
}
