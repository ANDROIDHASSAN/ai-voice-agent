# 🌐 Multilingual (English · हिंदी · मराठी)

Every demo agent is multilingual. How it works:

- **Understanding (STT):** Deepgram `nova-2` with language `multi` — auto-detects the
  caller's language (English + Hindi and more) with no extra keys. Set in
  `server/src/data/agents.js → buildTranscriber()`.
- **Speaking (TTS):** ships on **Deepgram (English)** so the demo works out of the box.
  To make agents *speak* Hindi/Marathi, switch to a multilingual voice:

## Enable Hindi/Marathi speech (one flag)
1. In the **Vapi dashboard → Integrations**, add a (free) **ElevenLabs** API key.
2. Set env var on the server / Vercel:
   ```
   MULTILINGUAL_VOICE=elevenlabs
   ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # any multilingual voice
   ```
3. Re-run `npm run provision` (re-points all 8 assistants to the multilingual voice).

ElevenLabs `eleven_multilingual_v2` speaks Hindi well and English natively. Marathi TTS
quality is best via **Azure** (`mr-IN` neural voices) — to use Azure instead, change
`buildVoice()` to `{ provider: "azure", voiceId: "mr-IN-AarohiNeural" }` and add an Azure
key in Vapi.

The **language the caller picks in the UI** is passed to the agent (`{{language}}`) and the
agent is instructed to greet/converse in it and follow the caller if they switch.
