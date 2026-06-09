import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db.js";
import vapiWebhook from "./routes/vapiWebhook.js";
import agentsRouter from "./routes/agents.js";

const app = express();

// Behind Vercel/Render proxies.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Security headers (CSP off for a JSON API; CORP cross-origin so the SPA can fetch).
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(express.json({ limit: "2mb" }));

// CORS allowlist (same-origin on Vercel-only, so this is mostly a safety net).
const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || origins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

// Warm the DB connection in the background (per cold instance). We never BLOCK
// a request on it — the Vapi webhook must respond fast even if Mongo is down.
connectDB().catch((e) => console.error("initial DB connect:", e.message));

app.get("/", (_req, res) => res.json({ service: "event-pr-voice-agent", status: "up" }));
app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Vapi posts tool-calls + end-of-call reports here
app.use("/api/vapi", vapiWebhook);

// Agent catalog + CRM
app.use("/api", agentsRouter);

// 404 + error handlers → always return JSON, never crash.
app.use((req, res) => res.status(404).json({ error: "Not found", path: req.path }));
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
