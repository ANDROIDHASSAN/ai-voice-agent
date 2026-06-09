/**
 * Provision ALL demo agents in Vapi from data/agents.js, and save their
 * assistant IDs into MongoDB (Agent collection) so the frontend catalog
 * (/api/agents) can serve them.
 *
 *   npm run provision
 *
 * Requires: VAPI_PRIVATE_KEY, SERVER_PUBLIC_URL, VAPI_WEBHOOK_SECRET, MONGODB_URI.
 */
import "dotenv/config";
import { connectDB } from "../src/config/db.js";
import { Agent } from "../src/models/Agent.js";
import {
  AGENTS,
  buildSystemPrompt,
  buildGreetings,
  buildTranscriber,
  buildVoice,
} from "../src/data/agents.js";

const KEY = process.env.VAPI_PRIVATE_KEY;
const BASE = "https://api.vapi.ai";

function webhookUrl(agentKey) {
  const base = process.env.SERVER_PUBLIC_URL.replace(/\/$/, "");
  return `${base}/api/vapi/webhook?agent=${agentKey}`;
}

function buildTools(agent) {
  const server = {
    url: webhookUrl(agent.key),
    ...(process.env.VAPI_WEBHOOK_SECRET ? { secret: process.env.VAPI_WEBHOOK_SECRET } : {}),
  };
  const tz = process.env.TIMEZONE || "Asia/Kolkata";
  return [
    {
      type: "function",
      function: {
        name: "getServices",
        description: `List the services/packages ${agent.brand} offers, with durations and pricing notes. Call when you need to confirm what's offered or pitch a package.`,
        parameters: { type: "object", properties: {} },
      },
      server,
    },
    {
      type: "function",
      function: {
        name: "checkAvailability",
        description: `Check OPEN appointment slots before proposing any time. Timezone ${tz}. Current date/time: {{now}}. Never promise a time without calling this.`,
        parameters: {
          type: "object",
          properties: {
            serviceKey: { type: "string", description: "The service key the caller wants (optional)." },
            startDateTime: { type: "string", description: `Start of the search window, ISO 8601, ${tz}.` },
            endDateTime: { type: "string", description: `End of the search window, ISO 8601, ${tz}.` },
          },
        },
      },
      server,
      messages: [{ type: "request-start", content: "Let me check what's open." }],
    },
    {
      type: "function",
      function: {
        name: "bookAppointment",
        description: `Book the appointment ONLY after a slot was confirmed open via checkAvailability and you collected & confirmed name + phone/email + the chosen service. Timezone ${tz}.`,
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            company: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            serviceKey: { type: "string", description: "Which service/package they chose." },
            startDateTime: { type: "string", description: `Confirmed start, ISO 8601, ${tz}.` },
            endDateTime: { type: "string", description: `End, ISO 8601, ${tz}.` },
            language: { type: "string", description: "Conversation language: English, Hindi, or Marathi." },
          },
          required: ["name", "startDateTime", "endDateTime"],
        },
      },
      server,
      messages: [{ type: "request-start", content: "Perfect, locking that in." }],
    },
  ];
}

function buildAssistant(agent) {
  const greetings = buildGreetings(agent);
  return {
    name: `${agent.brand} — ${agent.agentName}`.slice(0, 40),
    firstMessage: greetings.en,
    firstMessageMode: "assistant-speaks-first",
    model: {
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      messages: [{ role: "system", content: buildSystemPrompt(agent) }],
      tools: buildTools(agent),
    },
    transcriber: buildTranscriber(),
    voice: buildVoice(),
    server: {
      url: webhookUrl(agent.key),
      ...(process.env.VAPI_WEBHOOK_SECRET ? { secret: process.env.VAPI_WEBHOOK_SECRET } : {}),
    },
    serverMessages: ["end-of-call-report"],
    maxDurationSeconds: 600,
    silenceTimeoutSeconds: 30,
    endCallPhrases: ["bye", "goodbye", "talk soon", "thank you, goodbye"],
    analysisPlan: {
      summaryPlan: { enabled: true },
      structuredDataPlan: {
        enabled: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            company: { type: "string" },
            email: { type: "string" },
            interest: { type: "string" },
            language: { type: "string" },
            notes: { type: "string" },
          },
        },
      },
    },
  };
}

async function upsertVapi(agent, existingId) {
  const url = existingId ? `${BASE}/assistant/${existingId}` : `${BASE}/assistant`;
  const method = existingId ? "PATCH" : "POST";
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(buildAssistant(agent)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.id;
}

async function main() {
  if (!KEY) throw new Error("Set VAPI_PRIVATE_KEY");
  if (!process.env.SERVER_PUBLIC_URL || process.env.SERVER_PUBLIC_URL.includes("your-")) {
    throw new Error("Set SERVER_PUBLIC_URL to your live https URL (e.g. your Vercel URL).");
  }
  await connectDB();

  console.log(`\nProvisioning ${AGENTS.length} agents → ${process.env.SERVER_PUBLIC_URL}\n`);
  for (const agent of AGENTS) {
    const doc = await Agent.findOne({ key: agent.key }).lean();
    const existingId = doc?.assistantId;
    try {
      const assistantId = await upsertVapi(agent, existingId);
      await Agent.findOneAndUpdate(
        { key: agent.key },
        {
          key: agent.key,
          assistantId,
          brand: agent.brand,
          industry: agent.industry,
          agentName: agent.agentName,
          color: agent.color,
          emoji: agent.emoji,
          tagline: agent.tagline,
          blurb: agent.blurb,
          services: agent.services,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✅ ${agent.brand.padEnd(22)} ${existingId ? "updated" : "created"}  ${assistantId}`);
    } catch (e) {
      console.error(`  ❌ ${agent.brand}: ${e.message}`);
    }
  }
  console.log(`\nDone. The frontend will load these from /api/agents.\n`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
