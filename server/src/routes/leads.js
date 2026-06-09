import { Router } from "express";
import { Lead } from "../models/Lead.js";
import { Booking } from "../models/Booking.js";

const router = Router();

// Dashboard: latest leads
router.get("/leads", async (_req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(leads);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dashboard: upcoming/recent bookings
router.get("/bookings", async (_req, res) => {
  try {
    const bookings = await Booking.find().sort({ startDateTime: -1 }).limit(100).lean();
    res.json(bookings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
