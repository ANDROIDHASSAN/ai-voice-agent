import mongoose from "mongoose";

/**
 * A Lead is one prospect / one phone (or web) conversation with the agent.
 * It is created/updated from Vapi's end-of-call-report and tool calls.
 */
const LeadSchema = new mongoose.Schema(
  {
    callId: { type: String, index: true }, // Vapi call id (dedupe)
    name: String,
    company: String,
    email: String,
    phone: String,

    // Qualification captured during the conversation
    eventType: String,
    scale: String, // guests / cities
    eventDate: String, // tentative, free-text as the prospect said it
    budgetRange: String,
    decisionMaker: String,
    timeline: String,

    status: {
      type: String,
      enum: ["new", "qualified", "booked", "not_fit", "callback"],
      default: "new",
    },

    summary: String, // Vapi's end-of-call summary
    transcript: String, // full transcript text
    recordingUrl: String,
    durationSeconds: Number,
    endedReason: String,
    source: { type: String, default: "web" }, // web | phone-inbound | phone-outbound
  },
  { timestamps: true }
);

export const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
