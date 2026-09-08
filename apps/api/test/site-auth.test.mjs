import test from "node:test";
import assert from "node:assert/strict";
import {
  createSessionToken,
  passwordsMatch,
  readCookie,
  verifySessionToken
} from "../src/middleware/site-auth.mjs";

test("accepts a valid session and rejects expired or modified sessions", () => {
  const token = createSessionToken("session-secret", { now: 1_000, maxAgeMs: 5_000 });
  assert.equal(verifySessionToken(token, "session-secret", { now: 2_000 }), true);
  assert.equal(verifySessionToken(token, "session-secret", { now: 6_001 }), false);
  assert.equal(verifySessionToken(`${token}x`, "session-secret", { now: 2_000 }), false);
  assert.equal(verifySessionToken(token, "another-secret", { now: 2_000 }), false);
});

test("compares passwords and parses the session cookie", () => {
  assert.equal(passwordsMatch("demo password", "demo password"), true);
  assert.equal(passwordsMatch("wrong", "demo password"), false);
  assert.equal(readCookie("other=1; easy_poc_session=abc.def; theme=light", "easy_poc_session"), "abc.def");
});
