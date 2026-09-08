import path from "node:path";
import { existsSync } from "node:fs";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { mockSearchRouter } from "./routes/mock-search.mjs";
import { toolsRouter } from "./routes/tools.mjs";
import { catalogRouter } from "./routes/catalog.mjs";
import { elevenLabsRouter } from "./routes/elevenlabs.mjs";

const rootEnv = path.resolve(import.meta.dirname, "../../../.env");
dotenv.config({ path: rootEnv });

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.disable("x-powered-by");
app.use(cors({ origin: true, allowedHeaders: ["Content-Type", "x-api-key"] }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "easy-elevenlabs-poc",
    mockCatalog: true,
    realCencosudEnabled: String(process.env.USE_REAL_CENCOSUD_API ?? "false").toLowerCase() === "true",
    elevenLabsConfigured: Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID)
  });
});

app.use(mockSearchRouter);
app.use(toolsRouter);
app.use(catalogRouter);
app.use(elevenLabsRouter);

const webDist = path.resolve(import.meta.dirname, "../../web/dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || !req.accepts("html")) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status ?? 500).json({
    message: error.message ?? "Internal server error",
    ...(process.env.NODE_ENV !== "production" && error.payload ? { details: error.payload } : {})
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Easy POC API listening on http://0.0.0.0:${port}`);
});
