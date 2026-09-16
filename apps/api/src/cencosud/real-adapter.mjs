import { buildGraphQLRequest } from "./request.mjs";

const DEFAULT_TIMEOUT_MS = 10_000;

export function getCencosudSearchUrl(env = process.env) {
  if (env.CENCOSUD_SEARCH_URL) return env.CENCOSUD_SEARCH_URL;

  const baseUrl = env.CENCOSUD_SEARCH_BASE_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}/graphql` : null;
}

export async function searchRealCencosud(input, options = {}) {
  const searchUrl = getCencosudSearchUrl();
  const apiKey = process.env.CENCOSUD_SEARCH_API_KEY;
  if (!searchUrl || !apiKey) {
    throw new Error("CENCOSUD_SEARCH_URL (or CENCOSUD_SEARCH_BASE_URL) and CENCOSUD_SEARCH_API_KEY must be configured");
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = Number(process.env.CENCOSUD_SEARCH_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  const response = await fetchImpl(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "User-Agent": process.env.CENCOSUD_SEARCH_USER_AGENT || "ElevenLabs/1.0"
    },
    body: JSON.stringify(buildGraphQLRequest(input)),
    signal: AbortSignal.timeout(timeoutMs)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Cencosud Search API returned HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const error = new Error("Cencosud Search API returned GraphQL errors");
    error.status = 502;
    error.payload = payload.errors;
    throw error;
  }

  return payload;
}
