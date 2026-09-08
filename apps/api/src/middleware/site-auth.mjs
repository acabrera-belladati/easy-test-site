import crypto from "node:crypto";
import express from "express";

export const SITE_SESSION_COOKIE = "easy_poc_session";
export const SITE_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function signatureFor(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function passwordsMatch(received, expected) {
  if (typeof received !== "string" || typeof expected !== "string" || !expected) return false;
  const receivedHash = crypto.createHash("sha256").update(received).digest();
  const expectedHash = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(receivedHash, expectedHash);
}

export function createSessionToken(secret, { now = Date.now(), maxAgeMs = SITE_SESSION_MAX_AGE_MS } = {}) {
  const payload = Buffer.from(JSON.stringify({ expiresAt: now + maxAgeMs })).toString("base64url");
  return `${payload}.${signatureFor(payload, secret)}`;
}

export function verifySessionToken(token, secret, { now = Date.now() } = {}) {
  if (!token || !secret) return false;
  const [payload, signature, extra] = String(token).split(".");
  if (!payload || !signature || extra || !safeEqual(signature, signatureFor(payload, secret))) return false;

  try {
    const { expiresAt } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(expiresAt) && expiresAt > now;
  } catch {
    return false;
  }
}

export function readCookie(cookieHeader, name) {
  for (const part of String(cookieHeader ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

function authConfig() {
  const password = process.env.POC_ACCESS_PASSWORD ?? "";
  return {
    password,
    secret: process.env.POC_SESSION_SECRET || password,
    configured: Boolean(password)
  };
}

function hasValidSession(req) {
  const config = authConfig();
  const token = readCookie(req.get("cookie"), SITE_SESSION_COOKIE);
  return config.configured && verifySessionToken(token, config.secret);
}

export const siteAuthRouter = express.Router();

siteAuthRouter.get("/api/auth/session", (req, res) => {
  const config = authConfig();
  if (!config.configured) {
    return res.status(503).json({
      authenticated: false,
      configured: false,
      message: "POC_ACCESS_PASSWORD is not configured"
    });
  }
  res.json({ authenticated: hasValidSession(req), configured: true });
});

siteAuthRouter.post("/api/auth/login", (req, res) => {
  const config = authConfig();
  if (!config.configured) {
    return res.status(503).json({ message: "POC_ACCESS_PASSWORD is not configured" });
  }
  if (!passwordsMatch(req.body?.password, config.password)) {
    return res.status(401).json({ message: "Contraseña incorrecta" });
  }

  res.cookie(SITE_SESSION_COOKIE, createSessionToken(config.secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SITE_SESSION_MAX_AGE_MS,
    path: "/"
  });
  res.json({ authenticated: true });
});

siteAuthRouter.post("/api/auth/logout", (_req, res) => {
  res.clearCookie(SITE_SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  res.json({ authenticated: false });
});

export function requireSiteAuth(req, res, next) {
  const config = authConfig();
  if (!config.configured) {
    return res.status(503).json({ message: "POC_ACCESS_PASSWORD is not configured" });
  }
  if (!hasValidSession(req)) return res.status(401).json({ message: "Authentication required" });
  next();
}
