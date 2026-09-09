import path from "node:path";
import { chromium } from "playwright";
import { parseArgs, asInt } from "./cli.mjs";
import { readJson, readLines, writeJson } from "./io.mjs";
import { assertRobotsAllowed, USER_AGENT } from "./robots.mjs";
import { discoverFromSearch } from "./discover.mjs";
import { parseProductPage } from "./product-parser.mjs";

const args = parseArgs();
const limit = Math.max(1, asInt(args.limit, 30));
const delay = Math.max(250, asInt(args.delay, 1200));
const maxScrolls = Math.max(5, asInt(args["max-scrolls"], 35));
const headed = Boolean(args.headed);
const append = Boolean(args.append);
const skipRobots = Boolean(args["skip-robots-check"]);

const defaultSeed = path.resolve(import.meta.dirname, "../config/product-urls.txt");
const defaultOutput = path.resolve(import.meta.dirname, "../../api/data/products.json");
const output = args.output ? path.resolve(args.output) : defaultOutput;

function productKey(product) {
  return String(product?.sku || product?.id || product?.url || "").trim();
}

function mergeProducts(existing, incoming) {
  const merged = new Map();
  for (const product of existing ?? []) {
    const key = productKey(product);
    if (key) merged.set(key, product);
  }
  for (const product of incoming ?? []) {
    const key = productKey(product);
    if (key) merged.set(key, product);
  }
  return [...merged.values()];
}

const browser = await chromium.launch({ headless: !headed });
let urls = [];

try {
  if (args.search) {
    console.log(`Discovering Easy products for: ${args.search}`);
    urls.push(...await discoverFromSearch(browser, args.search, {
      limit,
      headed,
      skipRobots,
      maxScrolls
    }));
  }

  const seedFile = args["seed-file"]
    ? path.resolve(args["seed-file"])
    : (!args.search ? defaultSeed : null);

  if (seedFile) urls.push(...await readLines(seedFile));

  urls = [...new Set(urls)].slice(0, limit);
  console.log(`Product URLs queued for scraping: ${urls.length}`);

  if (!urls.length) {
    throw new Error("No product URLs discovered. Try --search or --seed-file.");
  }

  const context = await browser.newContext({
    userAgent: USER_AGENT,
    viewport: { width: 1440, height: 1000 }
  });
  const page = await context.newPage();
  const products = [];

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    try {
      await assertRobotsAllowed(url, { skip: skipRobots });
      console.log(`[${index + 1}/${urls.length}] ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(900);
      const product = await parseProductPage(page, url);

      if (!product.title || !product.sellingPrice) {
        console.warn(`  skipped: missing title or price (${product.title || "no title"}, ${product.sellingPrice || "no price"})`);
      } else {
        products.push(product);
        console.log(`  -> ${product.title} | $${product.sellingPrice}`);
      }
    } catch (error) {
      console.warn(`  failed: ${error.message}`);
    }

    if (index < urls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  await context.close();

  if (!products.length) {
    throw new Error("No products could be scraped; existing catalog was left untouched.");
  }

  if (append) {
    const existing = (await readJson(output, [])) ?? [];
    const merged = mergeProducts(existing, products);
    await writeJson(output, merged);
    console.log(`\nScraped ${products.length} products. Merged catalog: ${merged.length} products.`);
  } else {
    await writeJson(output, products);
    console.log(`\nSaved ${products.length} products to ${output}`);
  }
} finally {
  await browser.close();
}
