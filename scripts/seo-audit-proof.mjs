#!/usr/bin/env node
/**
 * SEO proof harness — prints real curl/parse outputs for audit.
 * Usage: node scripts/seo-audit-proof.mjs [baseUrl]
 */
import { writeFileSync, mkdirSync } from "fs";

const BASE = (process.argv[2] || "https://bharwanaestates.com").replace(/\/$/, "");
const OUT = "/tmp/seo-audit-proof";
mkdirSync(OUT, { recursive: true });

async function fetchText(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    redirect: opts.redirect || "manual",
    headers: { "user-agent": "BharwanaSEOAudit/1.0" },
    ...opts.fetchOpts,
  });
  const text = opts.noBody ? "" : await res.text();
  return { url, status: res.status, headers: Object.fromEntries(res.headers), text, location: res.headers.get("location") };
}

function pickMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function pickCanonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return m?.[1] ?? null;
}

function countH1(html) {
  const matches = html.match(/<h1\b[^>]*>/gi);
  return matches?.length ?? 0;
}

function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) blocks.push(m[1].trim());
  return blocks;
}

function hasFeaturedSignals(html) {
  const lower = html.toLowerCase();
  return {
    hasFeaturedWord: /featured/.test(lower),
    hasPropertyLinks: (html.match(/href=["']\/property\//g) || []).length,
    hasPriceLike: /pkr|rs\.?|price/i.test(html),
    samplePropertyHrefs: [...html.matchAll(/href=["'](\/property\/[^"']+)["']/g)].slice(0, 5).map((x) => x[1]),
  };
}

function pageReport(label, html, status) {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null;
  const jsonLd = extractJsonLd(html);
  const parsed = [];
  const jsonErrors = [];
  for (const block of jsonLd) {
    try {
      parsed.push(JSON.parse(block));
      if (block.includes("<") && !block.includes("\\u003c")) {
        jsonErrors.push("Unescaped < in JSON-LD string");
      }
    } catch (e) {
      jsonErrors.push(String(e.message || e));
    }
  }
  return {
    label,
    status,
    title,
    description: pickMeta(html, "description"),
    robots: pickMeta(html, "robots"),
    canonical: pickCanonical(html),
    ogTitle: pickMeta(html, "og:title"),
    ogImage: pickMeta(html, "og:image"),
    h1Count: countH1(html),
    h1Texts: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim().slice(0, 120),
    ),
    htmlBytes: html.length,
    featured: hasFeaturedSignals(html),
    jsonLdCount: jsonLd.length,
    jsonLdTypes: parsed.map((p) => p["@type"]),
    jsonLdParsed: parsed,
    jsonErrors,
    rawJsonLd: jsonLd,
  };
}

async function followRedirects(startPath, max = 8) {
  const chain = [];
  let url = startPath.startsWith("http") ? startPath : `${BASE}${startPath}`;
  for (let i = 0; i < max; i++) {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "BharwanaSEOAudit/1.0" } });
    const loc = res.headers.get("location");
    chain.push({ url, status: res.status, location: loc });
    if (res.status < 300 || res.status >= 400 || !loc) break;
    url = new URL(loc, url).toString();
  }
  return chain;
}

const report = { base: BASE, checkedAt: new Date().toISOString() };

// --- pages ---
const paths = ["/", "/properties", "/properties-in-multan"];
report.pages = {};
for (const path of paths) {
  const { status, text } = await fetchText(path, { redirect: "follow" });
  writeFileSync(`${OUT}${path === "/" ? "/home" : path.replace(/\//g, "_")}.html`, text);
  report.pages[path] = pageReport(path, text, status);
}

// discover one property from sitemap or home
const sm = await fetchText("/sitemap.xml", { redirect: "follow" });
report.robotsTxt = (await fetchText("/robots.txt", { redirect: "follow" })).text;
report.sitemapXmlPreview = sm.text.slice(0, 2500);
report.sitemapStatus = sm.status;

const locUrls = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const lastmods = [...sm.text.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
report.sitemap = {
  urlCount: locUrls.length,
  lastmodCount: lastmods.length,
  sampleLastmods: lastmods.slice(0, 8),
  hasQueryParams: locUrls.filter((u) => u.includes("?")),
  propertyUrls: locUrls.filter((u) => u.includes("/property/")),
  landingUrls: locUrls.filter((u) => !u.includes("/property/") && u !== `${BASE}/` && !u.match(/\/(about|team|faq|privacy|terms|cookies|disclaimer|deletion-policy|properties)$/)),
};

let propertyPath = report.sitemap.propertyUrls[0]?.replace(BASE, "") || null;
if (!propertyPath && report.pages["/"]?.featured?.samplePropertyHrefs?.[0]) {
  propertyPath = report.pages["/"].featured.samplePropertyHrefs[0];
}
report.pickedPropertyPath = propertyPath;

if (propertyPath) {
  const { status, text } = await fetchText(propertyPath, { redirect: "follow" });
  writeFileSync(`${OUT}/property.html`, text);
  report.pages[propertyPath] = pageReport(propertyPath, text, status);
  // bare id redirect
  const idMatch = propertyPath.match(/-(p-\d+)$/) || propertyPath.match(/-([A-Za-z0-9]{16,})$/);
  if (idMatch) {
    report.bareIdRedirect = await followRedirects(`/property/${idMatch[1]}`);
  }
}

// sitemap URL probe (cap 80 for runtime)
const toProbe = locUrls.slice(0, 80);
report.sitemapProbe = { checked: 0, non200: [], noindexLike: [] };
for (const u of toProbe) {
  const res = await fetch(u, { redirect: "follow", headers: { "user-agent": "BharwanaSEOAudit/1.0" } });
  const html = await res.text();
  report.sitemapProbe.checked++;
  if (res.status !== 200) report.sitemapProbe.non200.push({ u, status: res.status });
  const robots = pickMeta(html, "robots") || "";
  if (/noindex/i.test(robots)) report.sitemapProbe.noindexLike.push({ u, robots });
}

// redirects host
report.redirects = {
  httpToHttps: await followRedirects(BASE.replace("https://", "http://") + "/"),
  www: await followRedirects(BASE.replace("://", "://www.") + "/"),
};

// noindex targets
report.noindexTargets = {};
for (const path of ["/map", "/account", "/saved", "/login", "/admin", "/admin/login", "/properties?intent=buy&beds=3"]) {
  const { status, text, headers } = await fetchText(path, { redirect: "follow" });
  report.noindexTargets[path] = {
    status,
    robots: pickMeta(text, "robots"),
    canonical: pickCanonical(text),
    xRobots: headers["x-robots-tag"] || null,
  };
}

// fake 404
report.fakeProperty = await (async () => {
  const { status, text } = await fetchText("/property/this-listing-does-not-exist-p-0000000000000", { redirect: "follow" });
  return { status, robots: pickMeta(text, "robots"), title: text.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1], h1: [...text.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()) };
})();

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
