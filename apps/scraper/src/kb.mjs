import path from "node:path";
import { chromium } from "playwright";
import { parseArgs, asInt } from "./cli.mjs";
import { readLines, slugify, writeText } from "./io.mjs";
import { assertRobotsAllowed, USER_AGENT } from "./robots.mjs";

const args = parseArgs();
const file = path.resolve(args["seed-file"] || path.resolve(import.meta.dirname, "../config/kb-urls.txt"));
const outputDir = path.resolve(args.output || path.resolve(import.meta.dirname, "../output/kb"));
const delay = Math.max(250, asInt(args.delay, 1200));
const skipRobots = Boolean(args["skip-robots-check"]);
const urls = await readLines(file);

const browser = await chromium.launch({ headless: !args.headed });
try {
  const context = await browser.newContext({ userAgent: USER_AGENT, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i];
    try {
      await assertRobotsAllowed(url, { skip: skipRobots });
      console.log(`[${i + 1}/${urls.length}] ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(700);

      const article = await page.evaluate(() => {
        const root = document.querySelector("main") || document.querySelector('[role="main"]') || document.body;
        const title = root.querySelector("h1")?.textContent?.trim() || document.title;
        const nodes = [...root.querySelectorAll("h1,h2,h3,h4,p,li")];
        const chunks = [];
        let last = "";
        for (const node of nodes) {
          const text = (node.textContent || "").replace(/\s+/g, " ").trim();
          if (!text || text === last) continue;
          last = text;
          const tag = node.tagName.toLowerCase();
          if (tag === "h1") chunks.push(`# ${text}`);
          else if (tag === "h2") chunks.push(`## ${text}`);
          else if (tag === "h3") chunks.push(`### ${text}`);
          else if (tag === "h4") chunks.push(`#### ${text}`);
          else if (tag === "li") chunks.push(`- ${text}`);
          else chunks.push(text);
        }
        return { title, content: chunks.join("\n\n") };
      });

      const markdown = `---\nsource: ${url}\nscraped_at: ${new Date().toISOString()}\n---\n\n${article.content}\n`;
      await writeText(path.join(outputDir, `${slugify(article.title)}.md`), markdown);
      console.log(`  -> ${article.title}`);
    } catch (error) {
      console.warn(`  failed: ${error.message}`);
    }
    if (i < urls.length - 1) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  await context.close();
} finally {
  await browser.close();
}
