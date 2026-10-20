import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const VIEWPORTS = [
  { name: "360x640", width: 360, height: 640 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "844x390", width: 844, height: 390 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
] as const;

const PAGES = [
  { name: "home", path: "/" },
  { name: "properties", path: "/properties" },
  { name: "map", path: "/map" },
  { name: "about", path: "/about" },
  { name: "faq", path: "/faq" },
  { name: "team", path: "/team" },
  { name: "login", path: "/login" },
  { name: "saved", path: "/saved" },
  { name: "seo-multan", path: "/properties-in-multan" },
] as const;

const SHOT_DIR = path.join(process.cwd(), ".responsive-shots");

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
}

test.describe("responsive matrix", () => {
  test.beforeAll(() => {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
  });

  for (const viewport of VIEWPORTS) {
    for (const route of PAGES) {
      test(`${route.name} @ ${viewport.name} — no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
        // 404 landings (no listings) are acceptable; still check chrome doesn't overflow.
        const status = response?.status() ?? 0;
        expect(status, `HTTP ${status} for ${route.path}`).toBeLessThan(500);
        await page.waitForTimeout(400);
        const overflow = await horizontalOverflow(page);
        await page.screenshot({
          path: path.join(SHOT_DIR, `${route.name}__${viewport.name}.png`),
          fullPage: false,
        });
        expect(overflow, `horizontal overflow ${overflow}px on ${route.path}`).toBeLessThanOrEqual(1);
      });
    }
  }

  test("mobile touch targets on home @ 390", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const small = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      const tooSmall: string[] = [];
      for (const el of buttons.slice(0, 40)) {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.width < 40 || rect.height < 40) {
          const label = (el.textContent || el.getAttribute("aria-label") || el.tagName).trim().slice(0, 40);
          tooSmall.push(`${label} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        }
      }
      return tooSmall;
    });
    // Soft gate: allow a few decorative/link chips under 44px; flag if many.
    expect(small.length, `undersized controls: ${small.join("; ")}`).toBeLessThan(12);
  });
});
