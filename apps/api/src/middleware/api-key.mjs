export function requireMockApiKey(req, res, next) {
  if (String(process.env.ENFORCE_MOCK_API_KEY ?? "true").toLowerCase() === "false") return next();
  const expected = process.env.MOCK_API_KEY;
  if (!expected) return res.status(500).json({ message: "MOCK_API_KEY is not configured" });
  if (req.get("x-api-key") !== expected) return res.status(403).json({ message: "Forbidden" });
  next();
}
