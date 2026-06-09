import mongoose from "mongoose";

/**
 * A Booking is a confirmed discovery consultation written to Google Calendar.
 */
const BookingSchema = new mongoose.Schema(
  {
    callId: { type: String, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },

    name: String,
    company: String,
    email: String,
    phone: String,
    eventType: String,

    startDateTime: String, // ISO 8601
    endDateTime: String, // ISO 8601
    timeZone: String,

    googleEventId: String,
    htmlLink: String, // link to the calendar event
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
  },
  { timestamps: true }
);

export const Booking =
  mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
