import test from "node:test";
import assert from "node:assert/strict";
import { getCencosudSearchUrl, searchRealCencosud } from "../src/cencosud/real-adapter.mjs";

const originalEnv = {
  url: process.env.CENCOSUD_SEARCH_URL,
  baseUrl: process.env.CENCOSUD_SEARCH_BASE_URL,
  apiKey: process.env.CENCOSUD_SEARCH_API_KEY,
  timeout: process.env.CENCOSUD_SEARCH_TIMEOUT_MS,
  userAgent: process.env.CENCOSUD_SEARCH_USER_AGENT
};

test.afterEach(() => {
  for (const [name, value] of Object.entries({
    CENCOSUD_SEARCH_URL: originalEnv.url,
    CENCOSUD_SEARCH_BASE_URL: originalEnv.baseUrl,
    CENCOSUD_SEARCH_API_KEY: originalEnv.apiKey,
    CENCOSUD_SEARCH_TIMEOUT_MS: originalEnv.timeout,
    CENCOSUD_SEARCH_USER_AGENT: originalEnv.userAgent
  })) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test("uses the exact GraphQL URL when configured", () => {
  assert.equal(
    getCencosudSearchUrl({ CENCOSUD_SEARCH_URL: "https://example.com/v1/graphql" }),
    "https://example.com/v1/graphql"
  );
});

test("builds the GraphQL URL from the legacy base URL", () => {
  assert.equal(
    getCencosudSearchUrl({ CENCOSUD_SEARCH_BASE_URL: "https://example.com/v1/" }),
    "https://example.com/v1/graphql"
  );
});

test("posts the expected GraphQL request and headers", async () => {
  process.env.CENCOSUD_SEARCH_URL = "https://example.com/v1/graphql";
  process.env.CENCOSUD_SEARCH_API_KEY = "secret";

  let request;
  const payload = { data: { search: { totalSize: 0, products: [], facets: [] } } };
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  const input = { term: "taladro", filters: [], pagination: { pageSize: 5, page: 1 } };
  const result = await searchRealCencosud(input, { fetchImpl });

  assert.deepEqual(result, payload);
  assert.equal(request.url, "https://example.com/v1/graphql");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.headers["Content-Type"], "application/json");
  assert.equal(request.options.headers["x-api-key"], "secret");
  assert.equal(request.options.headers["User-Agent"], "ElevenLabs/1.0");
  assert.deepEqual(JSON.parse(request.options.body).variables.input, input);
});

test("turns GraphQL errors into an upstream error", async () => {
  process.env.CENCOSUD_SEARCH_URL = "https://example.com/v1/graphql";
  process.env.CENCOSUD_SEARCH_API_KEY = "secret";

  const fetchImpl = async () => new Response(
    JSON.stringify({ errors: [{ message: "Invalid input" }] }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

  await assert.rejects(
    searchRealCencosud({ term: "taladro" }, { fetchImpl }),
    (error) => error.status === 502 && error.payload[0].message === "Invalid input"
  );
});
