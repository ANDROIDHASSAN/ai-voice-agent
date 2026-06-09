import mongoose from "mongoose";

/**
 * A Lead = one prospect / one conversation with a demo agent.
 * Created/updated from tool calls and the end-of-call report.
 */
const LeadSchema = new mongoose.Schema(
  {
    callId: { type: String, index: true },
    agentKey: { type: String, index: true }, // which demo agent
    language: String, // en | hi | mr

    name: String,
    company: String,
    email: String,
    phone: String,

    // Qualification / interest
    interest: String, // what they want (service / need)
    notes: String,

    status: {
      type: String,
      enum: ["new", "qualified", "booked", "not_fit", "callback"],
      default: "new",
    },

    summary: String,
    transcript: String,
    recordingUrl: String,
    durationSeconds: Number,
    endedReason: String,
    source: { type: String, default: "web" },
  },
  { timestamps: true }
);

export const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
