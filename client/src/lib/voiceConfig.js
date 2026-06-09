// Per-language voice override passed to vapi.start(assistantId, overrides).
//
// English is intentionally LEFT ALONE (uses the assistant's provisioned voice,
// which works today and needs no Azure key). Hindi/Marathi override to Azure
// neural voices that actually speak those languages — this requires a (free)
// Azure Speech key added in the Vapi dashboard → Integrations.
//
// Swap voiceIds here to change gender/voice:
//   Hindi:   hi-IN-SwaraNeural (f) · hi-IN-MadhurNeural (m)
//   Marathi: mr-IN-AarohiNeural (f) · mr-IN-ManoharNeural (m)
export const VOICE_BY_LANG = {
  hi: { provider: "azure", voiceId: "hi-IN-SwaraNeural" },
  mr: { provider: "azure", voiceId: "mr-IN-AarohiNeural" },
};

export const LANG_NAME = { en: "English", hi: "Hindi", mr: "Marathi" };
export const LANG_LABEL = { en: "English", hi: "हिंदी", mr: "मराठी" };
