import { Router } from "express";
import mongoose from "mongoose";
import { checkAvailability, createEvent, humanSlot } from "../services/googleCalendar.js";
import { Lead } from "../models/Lead.js";
import { Booking } from "../models/Booking.js";

const router = Router();

// Only touch the DB when it's actually connected — never block a live tool
// response on a cold/unreachable Mongo (mongoose would buffer for ~10s).
const dbReady = () => mongoose.connection?.readyState === 1;

/**
 * Single webhook Vapi POSTs to for BOTH custom tool calls and call reports.
 * Configured as the tools' server.url and the assistant's server.url.
 *
 * Request shape (tool call):
 *   { message: { type: "tool-calls", toolCallList: [{ id, name, arguments }], call: { id } } }
 * Response shape we must return:
 *   { results: [{ toolCallId, result }] }
 */
router.post("/webhook", async (req, res) => {
  // 1) Verify the shared secret Vapi echoes back.
  const secret = req.get("x-vapi-secret");
  if (process.env.VAPI_WEBHOOK_SECRET && secret !== process.env.VAPI_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "bad secret" });
  }

  const message = req.body?.message;
  if (!message) return res.status(400).json({ error: "no message" });

  try {
    switch (message.type) {
      case "tool-calls":
        return res.json(await handleToolCalls(message));
      case "end-of-call-report":
        await handleEndOfCall(message);
        return res.json({ received: true });
      default:
        // status-update, transcript, hang, speech-update, etc. — just ack.
        return res.json({ received: true });
    }
  } catch (err) {
    console.error("Webhook error:", err);
    // Still return 200 with a spoken-friendly error so the agent can recover.
    return res.status(200).json({
      results: (message.toolCallList || []).map((tc) => ({
        toolCallId: tc.id,
        result:
          "I had a hiccup reaching the calendar just now. Let me try a different time, or I can have the team email you options today.",
      })),
    });
  }
});

async function handleToolCalls(message) {
  const calls = message.toolCallList || [];
  const callId = message.call?.id;
  const results = [];

  for (const tc of calls) {
    const name = tc.name || tc.function?.name;
    const args = tc.arguments || tc.function?.arguments || {};
    const parsed = typeof args === "string" ? safeJson(args) : args;

    if (name === "checkAvailability") {
      results.push({ toolCallId: tc.id, result: await runCheckAvailability(parsed) });
    } else if (name === "scheduleAppointment") {
      results.push({ toolCallId: tc.id, result: await runScheduleAppointment(parsed, callId) });
    } else {
      results.push({ toolCallId: tc.id, result: `Unknown tool "${name}".` });
    }
  }

  return { results };
}

async function runCheckAvailability(args) {
  const slots = await checkAvailability({
    startDateTime: args.startDateTime,
    endDateTime: args.endDateTime,
    durationMinutes: args.durationMinutes,
    limit: 4,
  });

  if (!slots.length) {
    return "There's nothing open in that window. Ask the prospect for another day or time and I'll check again.";
  }

  // Return a spoken-friendly summary + machine data so the model can offer two options.
  const spoken = slots.slice(0, 4).map((s) => s.label).join("; ");
  return {
    availableSlots: slots,
    spokenSummary: `Open slots: ${spoken}. Offer the prospect the first two and let them choose.`,
  };
}

async function runScheduleAppointment(args, callId) {
  const {
    name,
    company,
    email,
    phone,
    eventType,
    startDateTime,
    endDateTime,
  } = args;

  if (!email || !startDateTime || !endDateTime) {
    return "I still need the prospect's email and a confirmed start time before I can book. Collect those first.";
  }

  const agency = process.env.AGENCY_NAME || "the agency";
  const summary = `Discovery Call — ${company || name || "Prospect"} x ${agency}${
    eventType ? ` — ${eventType}` : ""
  }`;
  const description = [
    `Discovery consultation booked by the voice agent.`,
    name && `Name: ${name}`,
    company && `Company: ${company}`,
    phone && `Phone: ${phone}`,
    email && `Email: ${email}`,
    eventType && `Event: ${eventType}`,
  ]
    .filter(Boolean)
    .join("\n");

  const event = await createEvent({
    summary,
    description,
    startDateTime,
    endDateTime,
    attendeeEmails: [email, process.env.FOUNDER_EMAIL],
  });

  // Persist (best-effort — won't break the call if DB is down/cold).
  try {
    if (!dbReady()) throw new Error("DB not connected — skipping persistence");
    const lead = await Lead.findOneAndUpdate(
      { callId },
      {
        callId,
        name,
        company,
        email,
        phone,
        eventType,
        status: "booked",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Booking.create({
      callId,
      leadId: lead?._id,
      name,
      company,
      email,
      phone,
      eventType,
      startDateTime: event.start || startDateTime,
      endDateTime: event.end || endDateTime,
      timeZone: process.env.TIMEZONE || "Asia/Kolkata",
      googleEventId: event.googleEventId,
      htmlLink: event.htmlLink,
      status: "confirmed",
    });
  } catch (e) {
    console.error("Persist booking failed (event still created):", e.message);
  }

  const label = humanSlot(new Date(event.start || startDateTime));
  return {
    booked: true,
    htmlLink: event.htmlLink,
    spokenConfirmation: `Booked for ${label}. A calendar invite is on its way to ${email}, with ${
      process.env.FOUNDER_NAME || "the founder"
    } on it too.`,
  };
}

async function handleEndOfCall(message) {
  const callId = message.call?.id;
  if (!callId) return;
  if (!dbReady()) {
    console.warn("end-of-call-report received but DB not connected — skipping save");
    return;
  }

  const transcript = message.artifact?.transcript || message.transcript || "";
  const summary = message.analysis?.summary || message.summary || "";
  const structured = message.analysis?.structuredData || {};
  const recordingUrl = message.artifact?.recordingUrl || message.recordingUrl;
  const endedReason = message.endedReason;
  const durationSeconds = message.durationSeconds;
  const customer = message.call?.customer || {};

  await Lead.findOneAndUpdate(
    { callId },
    {
      $set: {
        callId,
        transcript,
        summary,
        recordingUrl,
        endedReason,
        durationSeconds,
        phone: customer.number,
        // structuredData (if you configure an analysis schema in Vapi) fills these
        ...pick(structured, [
          "name",
          "company",
          "email",
          "eventType",
          "scale",
          "eventDate",
          "budgetRange",
          "decisionMaker",
          "timeline",
        ]),
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
