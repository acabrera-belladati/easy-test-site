import { assertRobotsAllowed, USER_AGENT } from "./robots.mjs";

function normalizeProductUrl(href) {
  if (!href || typeof href !== "string") return null;

  try {
    const cleaned = href
      .replace(/\\u002F/gi, "/")
      .replace(/\\\//g, "/")
      .trim();

    const url = new URL(cleaned, "https://www.easy.cl");

    if (!/(^|\.)easy\.cl$/i.test(url.hostname)) {
      return null;
    }

    if (!/\/p\/?$/i.test(url.pathname)) {
      return null;
    }

    url.protocol = "https:";
    url.hostname = "www.easy.cl";
    url.search = "";
    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

function addCandidate(found, candidate) {
  const normalized = normalizeProductUrl(candidate);

  if (normalized) {
    found.add(normalized);
  }
}

function scanJsonValue(value, found, depth = 0) {
  if (depth > 12 || value == null) {
    return;
  }

  if (typeof value === "string") {
    addCandidate(found, value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      scanJsonValue(item, found, depth + 1);
    }
    return;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      scanJsonValue(item, found, depth + 1);
    }
  }
}

async function collectFromDom(page, found) {
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.href)
    )
    .catch(() => []);

  for (const href of hrefs) {
    addCandidate(found, href);
  }

  const scripts = await page
    .locator(
      'script[type="application/ld+json"], script[type="application/json"], script#__NEXT_DATA__'
    )
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.textContent || "")
        .filter(
          (text) =>
            text &&
            text.length < 5_000_000
        )
    )
    .catch(() => []);

  for (const text of scripts) {
    try {
      scanJsonValue(JSON.parse(text), found);
    } catch {
      const normalizedText = text
        .replace(/\\u002F/gi, "/")
        .replace(/\\\//g, "/");

      const matches = normalizedText.match(
        /(?:https?:\/\/www\.easy\.cl)?\/[^"'\s<>]+\/p(?:\?[^"'\s<>]*)?/gi
      );

      for (const match of matches ?? []) {
        addCandidate(found, match);
      }
    }
  }
}

async function clickLoadMoreIfPresent(page) {
  const patterns = [
    /ver más/i,
    /mostrar más/i,
    /cargar más/i,
    /ver siguientes/i,
    /más productos/i
  ];

  for (const pattern of patterns) {
    const locator = page
      .getByRole("button", {
        name: pattern
      })
      .or(
        page.getByRole("link", {
          name: pattern
        })
      )
      .first();

    if (
      await locator
        .isVisible()
        .catch(() => false)
    ) {
      await locator
        .click({
          timeout: 2_000
        })
        .catch(() => {});

      await page.waitForTimeout(900);
      return true;
    }
  }

  return false;
}

export async function discoverFromSearch(
  browser,
  query,
  {
    limit = 50,
    headed = false,
    skipRobots = false,
    maxScrolls = 35,
    settleMs = 900
  } = {}
) {
  const url =
    `https://www.easy.cl/search/${encodeURIComponent(query)}`;

  await assertRobotsAllowed(url, {
    skip: skipRobots
  });

  const context =
    await browser.newContext({
      userAgent: USER_AGENT,
      viewport: {
        width: 1440,
        height: 1000
      }
    });

  const page = await context.newPage();
  const found = new Set();
  const responseJobs = new Set();

  page.on("response", (response) => {
    const contentType = String(
      response.headers()["content-type"] ||
        ""
    ).toLowerCase();

    if (
      !contentType.includes(
        "json"
      )
    ) {
      return;
    }

    let job;

    job = response
      .json()
      .then((payload) => {
        scanJsonValue(
          payload,
          found
        );
      })
      .catch(() => {})
      .finally(() => {
        responseJobs.delete(job);
      });

    responseJobs.add(job);
  });

  try {
    await page.goto(url, {
      waitUntil:
        "domcontentloaded",
      timeout: 60_000
    });

    await page.waitForTimeout(
      1_800
    );

    await page
      .waitForLoadState(
        "networkidle",
        {
          timeout: 5_000
        }
      )
      .catch(() => {});

    let stagnantRounds = 0;
    let previousCount = 0;

    for (
      let round = 0;
      round < maxScrolls &&
      found.size < limit;
      round += 1
    ) {
      await collectFromDom(
        page,
        found
      );

      if (
        found.size >= limit
      ) {
        break;
      }

      const clickedMore =
        await clickLoadMoreIfPresent(
          page
        );

      const before =
        await page.evaluate(
          () => ({
            y: window.scrollY,
            viewport:
              window.innerHeight,
            height:
              document
                .documentElement
                .scrollHeight
          })
        );

      await page.evaluate(() => {
        const step = Math.max(
          window.innerHeight *
            1.25,
          1100
        );

        window.scrollBy({
          top: step,
          behavior: "instant"
        });
      });

      await page.waitForTimeout(
        settleMs
      );

      await collectFromDom(
        page,
        found
      );

      const after =
        await page.evaluate(
          () => ({
            y: window.scrollY,
            viewport:
              window.innerHeight,
            height:
              document
                .documentElement
                .scrollHeight
          })
        );

      const gained =
        found.size -
        previousCount;

      previousCount =
        found.size;

      console.log(
        `  discovery round ${round + 1}: ${found.size} unique product URLs` +
          (
            clickedMore
              ? " (load-more clicked)"
              : ""
          )
      );

      if (gained <= 0) {
        stagnantRounds += 1;
      } else {
        stagnantRounds = 0;
      }

      const atBottom =
        after.y +
          after.viewport >=
        after.height - 20;

      if (
        atBottom &&
        found.size < limit
      ) {
        await page.evaluate(
          () => {
            window.scrollTo(
              0,
              document
                .documentElement
                .scrollHeight
            );
          }
        );

        await page.waitForTimeout(
          settleMs + 400
        );

        await collectFromDom(
          page,
          found
        );
      }

      if (
        stagnantRounds >= 5 &&
        atBottom &&
        !clickedMore
      ) {
        break;
      }
    }

    await Promise.allSettled(
      [...responseJobs]
    );

    await collectFromDom(
      page,
      found
    );

    console.log(
      `Discovered ${found.size} unique Easy product URLs for "${query}".`
    );

    return [...found].slice(
      0,
      limit
    );
  } finally {
    await context.close();
  }
}