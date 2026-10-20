import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/account", "/login", "/signup", "/owner", "/dealer", "/sales"],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN.replace(/^https?:\/\//, ""),
  };
}
