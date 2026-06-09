import { Router } from "express";
import mongoose from "mongoose";
import { getAgent } from "../data/agents.js";
import { findOpenSlots, isSlotOpen, getService, humanSlot } from "../services/booking.js";
import { createEvent } from "../services/googleCalendar.js";
import { Agent } from "../models/Agent.js";
import { Lead } from "../models/Lead.js";
import { Booking } from "../models/Booking.js";

const router = Router();
const dbReady = () => mongoose.connection?.readyState === 1;

// assistantId -> agentKey cache (fallback when ?agent= isn't present)
const assistantMap = new Map();

async function resolveAgent(req, message) {
  // 1) Fast path: ?agent=<key> baked into the tool/server URL at provisioning.
  const q = req.query?.agent;
  if (q && getAgent(q)) return getAgent(q);

  // 2) Fallback: map by assistantId via DB (cached).
  const assistantId = message?.call?.assistantId || message?.assistant?.id;
  if (assistantId) {
    if (assistantMap.has(assistantId)) return getAgent(assistantMap.get(assistantId));
    if (dbReady()) {
      const doc = await Agent.findOne({ assistantId }).select("key").lean();
      if (doc?.key) {
        assistantMap.set(assistantId, doc.key);
        return getAgent(doc.key);
      }
    }
  }
  return null;
}

router.post("/webhook", async (req, res) => {
  const secret = req.get("x-vapi-secret");
  if (process.env.VAPI_WEBHOOK_SECRET && secret !== process.env.VAPI_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "bad secret" });
  }

  const message = req.body?.message;
  if (!message) return res.status(400).json({ error: "no message" });

  try {
    const agent = await resolveAgent(req, message);

    switch (message.type) {
      case "tool-calls":
        return res.json(await handleToolCalls(message, agent));
      case "end-of-call-report":
        await handleEndOfCall(message, agent, req.query?.lang);
        return res.json({ received: true });
      default:
        return res.json({ received: true });
    }
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).json({
      results: (message.toolCallList || []).map((tc) => ({
        toolCallId: tc.id,
        result:
          "I hit a small snag just now — let me try that again, or I can take your number and have the team follow up.",
      })),
    });
  }
});

async function handleToolCalls(message, agent) {
  const calls = message.toolCallList || [];
  const callId = message.call?.id;
  const results = [];

  for (const tc of calls) {
    const name = tc.name || tc.function?.name;
    const raw = tc.arguments || tc.function?.arguments || {};
    const args = typeof raw === "string" ? safeJson(raw) : raw;

    if (!agent) {
      results.push({ toolCallId: tc.id, result: "Configuration issue — please have the team email available times." });
      continue;
    }

    if (name === "getServices") {
      results.push({ toolCallId: tc.id, result: runGetServices(agent) });
    } else if (name === "checkAvailability") {
      results.push({ toolCallId: tc.id, result: await runCheckAvailability(agent, args) });
    } else if (name === "bookAppointment") {
      results.push({ toolCallId: tc.id, result: await runBook(agent, args, callId) });
    } else {
      results.push({ toolCallId: tc.id, result: `Unknown tool "${name}".` });
    }
  }
  return { results };
}

function runGetServices(agent) {
  return {
    services: agent.services.map((s) => ({
      key: s.key,
      name: s.name,
      durationMinutes: s.durationMin,
      pricing: s.priceHint,
      description: s.desc,
    })),
    note: "Offer the most relevant service; gently upsell a higher package if it fits, but prioritise booking.",
  };
}

async function runCheckAvailability(agent, args) {
  const slots = await findOpenSlots({
    agent,
    serviceKey: args.serviceKey,
    startDateTime: args.startDateTime,
    endDateTime: args.endDateTime,
    limit: 4,
  });
  if (!slots.length) {
    return "No open slots in that window — those times are booked. Ask the caller for another day and check again.";
  }
  return {
    availableSlots: slots,
    spokenSummary: `Open slots: ${slots.map((s) => s.label).join("; ")}. Offer the first two and let them choose.`,
  };
}

async function runBook(agent, args, callId) {
  const { name, email, phone, serviceKey, startDateTime, endDateTime, language, company } = args;

  if (!startDateTime || !endDateTime) {
    return "I still need a confirmed time before booking. Offer two open slots first.";
  }
  if (!name || (!phone && !email)) {
    return "I still need the caller's name and a phone or email before booking. Collect and confirm those first.";
  }

  const open = await isSlotOpen(agent.key, startDateTime, endDateTime);
  if (!open) {
    return "That slot was just taken. Let me offer another open time.";
  }

  const service = getService(agent, serviceKey);

  // Optional Google Calendar event (only if configured).
  let googleEventId, htmlLink;
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    try {
      const ev = await createEvent({
        summary: `${service?.name || "Appointment"} — ${name} — ${agent.brand}`,
        description: [`Booked via the ${agent.brand} voice agent.`, company && `Company: ${company}`, phone && `Phone: ${phone}`, email && `Email: ${email}`]
          .filter(Boolean)
          .join("\n"),
        startDateTime,
        endDateTime,
        attendeeEmails: [email, process.env.FOUNDER_EMAIL],
      });
      googleEventId = ev.googleEventId;
      htmlLink = ev.htmlLink;
    } catch (e) {
      console.error("Google event failed (continuing with DB booking):", e.message);
    }
  }

  // Persist (best-effort).
  try {
    if (dbReady()) {
      const lead = await Lead.findOneAndUpdate(
        { callId },
        { callId, agentKey: agent.key, language, name, company, email, phone, interest: service?.name, status: "booked" },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      await Booking.create({
        callId,
        leadId: lead?._id,
        agentKey: agent.key,
        language,
        name,
        company,
        email,
        phone,
        serviceKey: service?.key,
        serviceName: service?.name,
        startDateTime,
        endDateTime,
        timeZone: process.env.TIMEZONE || "Asia/Kolkata",
        googleEventId,
        htmlLink,
        status: "confirmed",
      });
    }
  } catch (e) {
    console.error("Persist booking failed:", e.message);
  }

  const label = humanSlot(new Date(startDateTime));
  return {
    booked: true,
    spokenConfirmation: `Booked: ${service?.name || "your appointment"} on ${label}. You'll get a confirmation shortly. ${
      htmlLink ? "A calendar invite is on its way too." : ""
    }`.trim(),
  };
}

async function handleEndOfCall(message, agent, lang) {
  const callId = message.call?.id;
  if (!callId || !dbReady()) return;

  const transcript = message.artifact?.transcript || message.transcript || "";
  const summary = message.analysis?.summary || message.summary || "";
  const structured = message.analysis?.structuredData || {};
  const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl;
  const customer = message.call?.customer || {};

  await Lead.findOneAndUpdate(
    { callId },
    {
      $set: {
        callId,
        agentKey: agent?.key,
        language: lang || structured.language,
        transcript,
        summary,
        recordingUrl,
        endedReason: message.endedReason,
        durationSeconds: message.durationSeconds,
        phone: customer.number,
        ...pick(structured, ["name", "company", "email", "interest", "notes"]),
      },
      $setOnInsert: { status: "new", source: "web" },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj?.[k] != null && obj[k] !== "") out[k] = obj[k];
  return out;
}
function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

export default router;
