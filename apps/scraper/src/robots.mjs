import robotsParser from "robots-parser";

const cache = new Map();
const USER_AGENT = "BelladatiEasyPOC/0.1";

async function getParser(targetUrl) {
  const url = new URL(targetUrl);
  const robotsUrl = `${url.origin}/robots.txt`;
  if (cache.has(robotsUrl)) return cache.get(robotsUrl);

  const response = await fetch(robotsUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Unable to read robots.txt (${response.status}) at ${robotsUrl}`);
  const text = await response.text();
  const parser = robotsParser(robotsUrl, text);
  cache.set(robotsUrl, parser);
  return parser;
}

export async function assertRobotsAllowed(targetUrl, { skip = false } = {}) {
  if (skip) return;
  const parser = await getParser(targetUrl);
  if (!parser.isAllowed(targetUrl, USER_AGENT)) {
    throw new Error(`robots.txt does not allow scraping: ${targetUrl}`);
  }
}

export { USER_AGENT };
