/**
 * Creates (or updates) the Vapi assistant + calendar tools from your .env.
 *
 *   npm run provision               # create a new assistant, prints its ID
 *   VAPI_ASSISTANT_ID=xxx npm run provision   # update an existing one
 *
 * Requires: VAPI_PRIVATE_KEY, SERVER_PUBLIC_URL, VAPI_WEBHOOK_SECRET, agency vars.
 * NOTE: add your GROQ_API_KEY in the Vapi dashboard under Provider Keys → Groq
 *       (Vapi calls Groq on your behalf — that's the free BYOK path).
 */
import "dotenv/config";
import { buildAssistant } from "../src/data/assistantConfig.js";

const KEY = process.env.VAPI_PRIVATE_KEY;
const BASE = "https://api.vapi.ai";

async function main() {
  if (!KEY) throw new Error("Set VAPI_PRIVATE_KEY in server/.env");
  if (!process.env.SERVER_PUBLIC_URL || process.env.SERVER_PUBLIC_URL.includes("your-")) {
    throw new Error(
      "Set SERVER_PUBLIC_URL to your public https URL (ngrok or host) so Vapi can reach the webhook."
    );
  }

  const mode = process.argv.includes("--outbound") ? "outbound" : "inbound";
  const assistant = buildAssistant(mode);
  const existingId = process.env.VAPI_ASSISTANT_ID;

  const url = existingId ? `${BASE}/assistant/${existingId}` : `${BASE}/assistant`;
  const method = existingId ? "PATCH" : "POST";

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(assistant),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("❌ Vapi error:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("\n✅ Assistant " + (existingId ? "updated" : "created"));
  console.log("   ID:", data.id);
  console.log("\n👉 Put this in client/.env:");
  console.log("   VITE_VAPI_ASSISTANT_ID=" + data.id);
  console.log("\n   Webhook (tools + reports) points at:");
  console.log("   " + process.env.SERVER_PUBLIC_URL.replace(/\/$/, "") + "/api/vapi/webhook\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
