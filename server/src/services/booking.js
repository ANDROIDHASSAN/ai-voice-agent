import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";

/**
 * DB-driven booking + availability.
 * Availability = business-hour slots MINUS already-confirmed bookings for that
 * agent (those slots are "packaged out"). No external dependency required, so
 * it works on the deployed demo immediately. Google Calendar is layered on
 * optionally in routes if configured.
 */

const TZ = () => process.env.TIMEZONE || "Asia/Kolkata";
const dbReady = () => mongoose.connection?.readyState === 1;

const hourInTz = (d, tz) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hour12: false }).format(d));

export function humanSlot(date, tz = TZ()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function getService(agent, serviceKey) {
  if (!agent?.services?.length) return null;
  return agent.services.find((s) => s.key === serviceKey) || agent.services[0];
}

/**
 * Return up to `limit` open slots for an agent/service inside an optional
 * window. If no window, search forward from now across business days.
 */
export async function findOpenSlots({
  agent,
  serviceKey,
  startDateTime,
  endDateTime,
  limit = 4,
}) {
  const tz = TZ();
  const service = getService(agent, serviceKey);
  const durationMin = service?.durationMin || 30;
  const stepMs = durationMin * 60 * 1000;
  const bhStart = agent.businessHoursStart ?? 10;
  const bhEnd = agent.businessHoursEnd ?? 19;

  // Window: given, else now → +10 days.
  const now = new Date();
  let from = startDateTime ? new Date(startDateTime) : new Date(now.getTime() + 60 * 60 * 1000);
  if (from < now) from = new Date(now.getTime() + 60 * 60 * 1000);
  const to = endDateTime ? new Date(endDateTime) : new Date(from.getTime() + 10 * 24 * 60 * 60 * 1000);

  // Existing confirmed bookings for this agent in the window.
  let busy = [];
  if (dbReady()) {
    const rows = await Booking.find({
      agentKey: agent.key,
      status: "confirmed",
      startDateTime: { $gte: from.toISOString(), $lte: to.toISOString() },
    })
      .select("startDateTime endDateTime")
      .lean();
    busy = rows.map((r) => [new Date(r.startDateTime).getTime(), new Date(r.endDateTime).getTime()]);
  }

  const slots = [];
  // Align to the top/half of the hour for tidy times.
  let t = Math.ceil(from.getTime() / stepMs) * stepMs;
  const end = to.getTime();
  let guard = 0;
  while (t + stepMs <= end && slots.length < limit && guard < 5000) {
    guard++;
    const start = new Date(t);
    const finish = new Date(t + stepMs);
    const h = hourInTz(start, tz);
    if (h >= bhStart && h < bhEnd) {
      const overlaps = busy.some(([bs, be]) => start.getTime() < be && finish.getTime() > bs);
      if (!overlaps) {
        slots.push({
          startDateTime: start.toISOString(),
          endDateTime: finish.toISOString(),
          timeZone: tz,
          label: humanSlot(start, tz),
        });
      }
    }
    t += stepMs;
  }
  return slots;
}

/** Is a specific slot still open for this agent? */
export async function isSlotOpen(agentKey, startDateTime, endDateTime) {
  if (!dbReady()) return true; // best-effort; don't block booking if DB down
  const clash = await Booking.findOne({
    agentKey,
    status: "confirmed",
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  }).lean();
  return !clash;
}
