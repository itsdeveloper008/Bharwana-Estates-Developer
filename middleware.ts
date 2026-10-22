import { NextResponse, type NextRequest } from "next/server";
import { parsePropertyParam } from "@/lib/seo/slug";

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

const FIRESTORE_PROJECT =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bharwana-estate-developer";

const NOT_FOUND_HTML = `<!DOCTYPE html>
<html lang="en-PK">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, follow"/>
<title>Not found | Bharwana Estates</title>
</head>
<body style="margin:0;font-family:Georgia,serif;background:#FBFAF6;color:#082B1D">
<main style="min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem;text-align:center">
<p style="letter-spacing:0.2em;text-transform:uppercase;font-size:0.75rem;opacity:0.7">404</p>
<h1 style="margin:0.75rem 0 0;font-size:2.25rem;font-weight:400">This page is not on the floor</h1>
<a href="/" style="margin-top:2rem;display:inline-flex;align-items:center;justify-content:center;padding:0.75rem 1rem;border-radius:0.75rem;background:#C4A35A;color:#082B1D;text-decoration:none;font-family:system-ui,sans-serif;font-size:0.875rem;font-weight:500">Return home</a>
</main>
</body>
</html>`;

async function propertyDocumentExists(id: string): Promise<boolean> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/properties/${encodeURIComponent(id)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    const body = (await res.json()) as { error?: { status?: string }; name?: string };
    if (body?.error?.status === "NOT_FOUND") return false;
    return Boolean(body?.name);
  } catch {
    // On transport failure, let the page handle it (Admin SDK / notFound).
    return true;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/property/")) {
    const param = pathname.slice("/property/".length);
    const { id } = parsePropertyParam(param);
    if (!id || !(await propertyDocumentExists(id))) {
      return new NextResponse(NOT_FOUND_HTML, {
        status: 404,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-robots-tag": "noindex, follow",
          "cache-control": "public, max-age=0, must-revalidate",
        },
      });
    }
    return NextResponse.next();
  }

  const slug = pathname.replace(/^\//, "");
  if (!SEO_LANDING_SLUGS.has(slug)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/seo-landing/${slug}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/property/:path*",
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
