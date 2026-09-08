import { buildGraphQLRequest } from "./request.mjs";

export async function searchRealCencosud(input) {
  const baseUrl = process.env.CENCOSUD_SEARCH_BASE_URL?.replace(/\/$/, "");
  const apiKey = process.env.CENCOSUD_SEARCH_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("CENCOSUD_SEARCH_BASE_URL/CENCOSUD_SEARCH_API_KEY are not configured");

  const response = await fetch(`${baseUrl}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify(buildGraphQLRequest(input))
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Cencosud Search API returned HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}
