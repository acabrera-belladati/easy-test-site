import { assertRobotsAllowed, USER_AGENT } from "./robots.mjs";

function normalizeProductUrl(href) {
  try {
    const url = new URL(href, "https://www.easy.cl");
    if (url.hostname !== "www.easy.cl") return null;
    url.search = "";
    url.hash = "";
    if (!/\/p\/?$/.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function discoverFromSearch(browser, query, { limit = 50, headed = false, skipRobots = false } = {}) {
  const url = `https://www.easy.cl/search/${encodeURIComponent(query)}`;
  await assertRobotsAllowed(url, { skip: skipRobots });

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1440, height: 1000 }
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);

  for (let i = 0; i < 5; i += 1) {
    await page.mouse.wheel(0, 1600);
    await page.waitForTimeout(500);
  }

  const hrefs = await page.locator('a[href*="/p"]').evaluateAll((anchors) => anchors.map((a) => a.href));
  await context.close();

  return [...new Set(hrefs.map(normalizeProductUrl).filter(Boolean))].slice(0, limit);
}
