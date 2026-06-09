import { Router } from "express";
import mongoose from "mongoose";
import { AGENTS, getAgent, buildGreetings } from "../data/agents.js";
import { Agent } from "../models/Agent.js";
import { Lead } from "../models/Lead.js";
import { Booking } from "../models/Booking.js";
import { findOpenSlots } from "../services/booking.js";

const router = Router();
const dbReady = () => mongoose.connection?.readyState === 1;

/**
 * Public catalog for the frontend gallery. Merges static display data with the
 * provisioned assistantId from the DB (falls back to env-injected map for
 * environments where provisioning wrote ids elsewhere).
 */
router.get("/agents", async (_req, res) => {
  try {
    let idMap = {};
    if (dbReady()) {
      const docs = await Agent.find().select("key assistantId").lean();
      idMap = Object.fromEntries(docs.map((d) => [d.key, d.assistantId]));
    }
    const catalog = AGENTS.map((a) => ({
      key: a.key,
      brand: a.brand,
      industry: a.industry,
      agentName: a.agentName,
      color: a.color,
      emoji: a.emoji,
      tagline: a.tagline,
      blurb: a.blurb,
      services: a.services.map((s) => ({ name: s.name, durationMin: s.durationMin, priceHint: s.priceHint })),
      greetings: buildGreetings(a),
      assistantId: idMap[a.key] || null,
    }));
    res.json(catalog);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Public: upcoming open slots for an agent (used by the UI "availability" peek). */
router.get("/agents/:key/availability", async (req, res) => {
  const agent = getAgent(req.params.key);
  if (!agent) return res.status(404).json({ error: "unknown agent" });
  try {
    const slots = await findOpenSlots({ agent, serviceKey: req.query.service, limit: 6 });
    res.json({ slots });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ----------------------------- CRM ----------------------------- */

router.get("/leads", async (req, res) => {
  try {
    const q = {};
    if (req.query.agent) q.agentKey = req.query.agent;
    if (req.query.status) q.status = req.query.status;
    const leads = await Lead.find(q).sort({ createdAt: -1 }).limit(300).lean();
    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/bookings", async (req, res) => {
  try {
    const q = {};
    if (req.query.agent) q.agentKey = req.query.agent;
    if (req.query.status) q.status = req.query.status;
    const bookings = await Booking.find(q).sort({ startDateTime: -1 }).limit(300).lean();
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** CRM control: update a lead's status. */
router.patch("/leads/:id", async (req, res) => {
  try {
    const allowed = ["new", "qualified", "booked", "not_fit", "callback"];
    const update = {};
    if (allowed.includes(req.body?.status)) update.status = req.body.status;
    if (typeof req.body?.notes === "string") update.notes = req.body.notes;
    const lead = await Lead.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    res.json(lead);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** CRM control: cancel a booking (frees the slot). */
router.patch("/bookings/:id/cancel", async (req, res) => {
  try {
    const b = await Booking.findByIdAndUpdate(req.params.id, { status: "cancelled" }, { new: true }).lean();
    res.json(b);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Dashboard stats per agent + totals. */
router.get("/stats", async (_req, res) => {
  try {
    if (!dbReady()) return res.json({ totals: {}, perAgent: [] });
    const [leadAgg, bookingAgg] = await Promise.all([
      Lead.aggregate([{ $group: { _id: "$agentKey", leads: { $sum: 1 }, booked: { $sum: { $cond: [{ $eq: ["$status", "booked"] }, 1, 0] } } } }]),
      Booking.aggregate([{ $match: { status: "confirmed" } }, { $group: { _id: "$agentKey", bookings: { $sum: 1 } } }]),
    ]);
    const bookingMap = Object.fromEntries(bookingAgg.map((b) => [b._id, b.bookings]));
    const perAgent = AGENTS.map((a) => {
      const l = leadAgg.find((x) => x._id === a.key) || { leads: 0, booked: 0 };
      return {
        key: a.key,
        brand: a.brand,
        emoji: a.emoji,
        color: a.color,
        leads: l.leads,
        booked: l.booked,
        bookings: bookingMap[a.key] || 0,
        conversion: l.leads ? Math.round((l.booked / l.leads) * 100) : 0,
      };
    });
    const totals = {
      leads: perAgent.reduce((s, a) => s + a.leads, 0),
      bookings: perAgent.reduce((s, a) => s + a.bookings, 0),
    };
    res.json({ totals, perAgent });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
