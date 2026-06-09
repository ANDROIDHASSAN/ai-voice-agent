import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db.js";
import vapiWebhook from "./routes/vapiWebhook.js";
import leadsRouter from "./routes/leads.js";

const app = express();

// Render/Vercel sit behind a proxy — trust it so secure cookies / IPs work.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Security headers. CSP is off (this is a JSON API, not HTML) and CORP is set
// to cross-origin so the deployed frontend can still fetch the dashboard data.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(express.json({ limit: "2mb" }));

// CORS — comma-separated allowlist from CLIENT_ORIGIN (your Vercel URL in prod).
const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin/server-to-server (no Origin header) and any allowlisted origin.
      if (!origin || origins.includes(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

// Friendly root + health (Render health check hits /health).
app.get("/", (_req, res) =>
  res.json({ service: "event-pr-voice-agent", status: "up" })
);
app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Vapi posts tool-calls + end-of-call reports here
app.use("/api/vapi", vapiWebhook);

// Dashboard data
app.use("/api", leadsRouter);

// 404 + error handlers (so failures return JSON, never crash the process).
app.use((req, res) => res.status(404).json({ error: "Not found", path: req.path }));
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 8080;

// Listen immediately so the webhook/health are up even if the DB is slow/cold.
app.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
  console.log(`   Webhook: ${process.env.SERVER_PUBLIC_URL || "(set SERVER_PUBLIC_URL)"}/api/vapi/webhook`);
});

// Connect to Mongo in the background.
connectDB().catch((e) => console.error("DB connect failed (continuing):", e.message));

// Don't let an unexpected rejection kill the server on Render.
process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));
