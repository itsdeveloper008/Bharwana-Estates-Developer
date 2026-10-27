import { NextResponse, type NextRequest } from "next/server";

/** Pretty SEO landing URLs → internal `/seo-landing/[slug]` (keeps `/about` etc. untouched). */
const SEO_LANDING_SLUGS = new Set([
  "properties-in-multan",
  "houses-for-sale-in-multan",
  "plots-for-sale-in-multan",
  "commercial-property-in-multan",
  "houses-for-rent-in-multan",
  "dha-multan",
  "buch-villas-multan",
  "bosan-road-multan",
  "gulgasht-multan",
  "cantt-multan",
]);

export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.replace(/^\//, "");
  if (!SEO_LANDING_SLUGS.has(slug)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/seo-landing/${slug}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/properties-in-multan",
    "/houses-for-sale-in-multan",
    "/plots-for-sale-in-multan",
    "/commercial-property-in-multan",
    "/houses-for-rent-in-multan",
    "/dha-multan",
    "/buch-villas-multan",
    "/bosan-road-multan",
    "/gulgasht-multan",
    "/cantt-multan",
  ],
};
