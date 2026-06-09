// Local development entrypoint. On Vercel the app is served by /api/index.js
// (serverless) instead, so this file's app.listen never runs there.
import app from "./app.js";

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
  console.log(`   Webhook: ${process.env.SERVER_PUBLIC_URL || "(set SERVER_PUBLIC_URL)"}/api/vapi/webhook`);
});

process.on("unhandledRejection", (e) => console.error("unhandledRejection:", e));
