import mongoose from "mongoose";

/**
 * One demo agent. Display fields come from data/agents.js; the assistantId is
 * filled by scripts/provisionAll.js after the Vapi assistant is created.
 * The /api/agents endpoint serves these to the frontend catalog.
 */
const ServiceSchema = new mongoose.Schema(
  {
    key: String,
    name: String,
    durationMin: Number,
    priceHint: String,
    desc: String,
  },
  { _id: false }
);

const AgentSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, index: true },
    assistantId: String,
    brand: String,
    industry: String,
    agentName: String,
    color: String,
    emoji: String,
    tagline: String,
    blurb: String,
    services: [ServiceSchema],
    // Business hours used for availability (local TIMEZONE)
    businessHoursStart: { type: Number, default: 10 },
    businessHoursEnd: { type: Number, default: 19 },
  },
  { timestamps: true }
);

export const Agent = mongoose.models.Agent || mongoose.model("Agent", AgentSchema);
