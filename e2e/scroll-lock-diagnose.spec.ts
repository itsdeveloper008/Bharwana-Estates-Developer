import { expect, test, type Page } from "@playwright/test";
import path from "path";

const shots = path.join(process.cwd(), ".responsive-shots", "scroll-lock-diag");

type Snapshot = {
  label: string;
  scrollY: number;
  chrome: { top: number; height: number };
  htmlGutter: string;
  body: Record<string, string>;
  scrollLocked: string | null;
};

async function measure(page: Page, label: string): Promise<Snapshot> {
  return page.evaluate((lbl) => {
    const pick = (el: Element | null, props: string[]) => {
      if (!el) return {} as Record<string, string>;
      const cs = getComputedStyle(el);
      return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p).trim()]));
    };
    const props = ["overflow", "overflow-x", "overflow-y", "padding-right", "margin-right", "position"];
    const chrome = document.querySelector("[data-diag-chrome]") as HTMLElement | null;
    const rect = chrome?.getBoundingClientRect();
    return {
      label: lbl,
      scrollY: window.scrollY,
      chrome: { top: rect?.top ?? -999, height: rect?.height ?? -1 },
      htmlGutter: getComputedStyle(document.documentElement).scrollbarGutter,
      body: pick(document.body, props),
      scrollLocked: document.body.getAttribute("data-scroll-locked"),
    };
  }, label);
}

test.describe("scroll-lock chrome stability", () => {
  test("harness: fixed chrome stays at top:0 under body scroll-lock styles", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  html { overflow-x: clip; scrollbar-gutter: stable; }
  body { margin: 0; overflow-x: clip; font-family: system-ui; }
  body[data-scroll-locked] {
    margin-right: 0 !important;
    padding-right: 0 !important;
    padding-left: 0 !important;
    padding-top: 0 !important;
  }
  aside {
    position: fixed; inset: 0 auto 0 0; width: 280px; z-index: 30;
    background: #0f3d2e; color: #f5f1e8; display: flex; flex-direction: column;
    height: 100dvh;
  }
  .nav { flex: 1; overflow-y: auto; padding: 12px; }
  .nav a { display: block; padding: 10px 8px; }
  .spacer { width: 280px; flex-shrink: 0; }
  .shell { display: flex; min-height: 100vh; }
  header {
    position: fixed; inset: 0 0 auto 0; z-index: 50; height: 64px;
    background: #fbfaf6; border-bottom: 1px solid #ccc;
    display: flex; align-items: center; padding: 0 16px;
  }
  .header-spacer { height: 64px; }
  main { flex: 1; padding: 24px; }
  .tall { height: 2200px; }
  body.lock {
    overflow: hidden !important;
    overscroll-behavior: contain;
    position: relative !important;
    margin-right: 15px !important;
  }
</style>
</head>
<body>
  <header data-diag-chrome>Public header</header>
  <div class="header-spacer" aria-hidden></div>
  <div class="shell">
    <aside data-diag-chrome-aside>
      <div style="padding:16px">Brand</div>
      <div class="nav">
        ${Array.from({ length: 18 }, (_, i) => `<a href="#">Nav ${i + 1}</a>`).join("")}
        <a href="#">Reports</a>
        <a href="#">Staff</a>
      </div>
      <div style="padding:16px">Profile</div>
    </aside>
    <div class="spacer" aria-hidden></div>
    <main>
      <div class="tall">
        <div style="margin-top:1400px">
          <button id="lock" type="button">Apply lock</button>
          <button id="unlock" type="button">Clear lock</button>
        </div>
      </div>
    </main>
  </div>
  <script>
    document.getElementById('lock').onclick = () => {
      document.body.classList.add('lock');
      document.body.setAttribute('data-scroll-locked', '1');
    };
    document.getElementById('unlock').onclick = () => {
      document.body.classList.remove('lock');
      document.body.removeAttribute('data-scroll-locked');
    };
  </script>
</body>
</html>`);

    await page.locator("#lock").scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const before = await measure(page, "before");
    await page.screenshot({ path: path.join(shots, "fixed-before.png"), fullPage: false });

    await page.click("#lock");
    await page.waitForTimeout(100);
    const whileOpen = await measure(page, "while-locked");
    await page.screenshot({ path: path.join(shots, "fixed-locked.png"), fullPage: false });

    const asideTops = await page.evaluate(() => {
      const aside = document.querySelector("[data-diag-chrome-aside]")!.getBoundingClientRect();
      return { top: aside.top, scrollY: window.scrollY };
    });

    await page.click("#unlock");
    await page.waitForTimeout(100);
    const after = await measure(page, "after");
    await page.screenshot({ path: path.join(shots, "fixed-after.png"), fullPage: false });

    console.log("DIAG_JSON", JSON.stringify({ before, whileOpen, after, asideTops }, null, 2));

    expect(before.chrome.top).toBe(0);
    expect(whileOpen.chrome.top).toBe(0);
    expect(after.chrome.top).toBe(0);
    expect(asideTops.top).toBe(0);
    expect(whileOpen.scrollY).toBe(before.scrollY);
    // Fixed chrome must not move even if lock injects a gap margin.
  });

  test("live /properties: header stays at top when Select opens", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/properties?intent=buy", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      const h = document.querySelector("header");
      if (h) h.setAttribute("data-diag-chrome", "1");
    });

    await page.evaluate(() => window.scrollTo(0, 520));
    await page.waitForTimeout(200);

    const trigger = page.locator('[role="combobox"]').first();
    test.skip((await trigger.count()) === 0, "no combobox on /properties");

    await trigger.scrollIntoViewIfNeeded();
    const before = await measure(page, "before");
    await trigger.click();
    await page.waitForTimeout(300);
    const whileOpen = await measure(page, "while-open");
    await page.screenshot({ path: path.join(shots, "live-select-open.png"), fullPage: false });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const after = await measure(page, "after");

    console.log("DIAG_JSON", JSON.stringify({ before, whileOpen, after }, null, 2));

    expect(before.chrome.top).toBe(0);
    expect(whileOpen.chrome.top).toBe(0);
    expect(after.chrome.top).toBe(0);
    expect(Math.abs(whileOpen.scrollY - before.scrollY)).toBeLessThanOrEqual(2);
  });
});
