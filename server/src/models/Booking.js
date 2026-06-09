import mongoose from "mongoose";

/**
 * A confirmed appointment booked by an agent.
 * Availability is computed from these docs (a slot with a confirmed booking
 * for the same agent is "packaged out" / unavailable).
 */
const BookingSchema = new mongoose.Schema(
  {
    callId: { type: String, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    agentKey: { type: String, index: true },
    language: String,

    name: String,
    company: String,
    email: String,
    phone: String,

    serviceKey: String,
    serviceName: String,

    startDateTime: { type: String, index: true }, // ISO 8601
    endDateTime: String,
    timeZone: String,

    // Google Calendar (optional — only if configured)
    googleEventId: String,
    htmlLink: String,

    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
  },
  { timestamps: true }
);

export const Booking =
  mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
