# 🎙️ Event Management & PR — Voice Sales Agent (MERN, free stack)

A browser-based AI voice agent that talks to prospects, qualifies them, and **books a discovery consultation on Google Calendar** — built entirely on free tiers.

> The conversion is a **booked, qualified consultation** with the founder. The agent never closes high-ticket on the call — it builds credibility, qualifies, creates desire, and locks the meeting.

## Architecture (all free)

```
┌──────────────────────┐      WebRTC voice       ┌─────────────────────┐
│  React client (Vite) │◀───────────────────────▶│   Vapi (voice infra)│
│  @vapi-ai/web widget │                          │  • Groq Llama 3.3   │ ← free LLM (BYOK)
│  + leads dashboard   │                          │  • Deepgram STT/TTS │
└──────────┬───────────┘                          └──────────┬──────────┘
           │ REST (leads/bookings)                           │ tool-calls + call report
           ▼                                                 ▼  (webhook)
┌─────────────────────────────────────────────────────────────────────┐
│  Express + Node server                                                │
│   • /api/vapi/webhook  → handles checkAvailability / scheduleAppt.    │
│   • Google Calendar API (real invites)   • Mongoose models            │
└──────────┬─────────────────────────────────┬──────────────────────────┘
           ▼                                 ▼
   MongoDB Atlas (free M0)         Google Calendar (free)
```

| Layer | Tech | Cost |
|---|---|---|
| Frontend | React + Vite + `@vapi-ai/web` | Free |
| Backend | Node + Express + Mongoose | Free |
| Database | MongoDB Atlas **M0** | Free forever |
| Voice (STT/TTS/telephony) | **Vapi** | $10 free credit (~40–65 min of calls) |
| LLM brain | **Groq** Llama 3.3 70B (BYOK into Vapi) | Free tier |
| Calendar / invites | **Google Calendar API** | Free |

> The only thing that eventually costs money is **live call minutes on Vapi** (~$0.05–$0.15/min on this cheap stack once the $10 credit runs out). Building, testing via the web widget, and the entire MERN app are free.

---

## Folder layout

```
voice bots/
├─ server/                 # Express API + Vapi webhook + Google Calendar + Mongo
│  ├─ src/
│  │  ├─ index.js
│  │  ├─ data/assistantConfig.js   # system prompt + Groq model + tool defs
│  │  ├─ routes/vapiWebhook.js      # the integration crux
│  │  ├─ services/googleCalendar.js
│  │  ├─ models/{Lead,Booking}.js
│  │  └─ routes/leads.js
│  └─ scripts/{googleAuth.js, provisionAssistant.js}
└─ client/                 # React voice widget + dashboard
```

---

## Setup — step by step (~30 min, all free)

### 0. Prerequisites
- Node 18+ installed.
- A microphone + Chrome/Edge for testing.

### 1. Get the free accounts & keys
1. **MongoDB Atlas** → create a free **M0** cluster → copy the connection string (`MONGODB_URI`). https://mongodb.com/atlas
2. **Vapi** → sign up (free $10 credit, no card) → from the dashboard copy your **Public key** and **Private key**. https://dashboard.vapi.ai
3. **Groq** → create a free API key. https://console.groq.com/keys
   - In the **Vapi dashboard → Provider Keys → Groq**, paste your Groq key. (This is the free BYOK path — Vapi calls Groq with your key.)
4. **Google Cloud** → new project → **enable "Google Calendar API"** → **Credentials → Create OAuth client ID → Web application** → add redirect URI `http://localhost:8080/oauth2callback` → copy the Client ID + Secret. https://console.cloud.google.com

### 2. Configure & run the server
```powershell
cd "server"
npm install
copy .env.example .env       # then edit .env with your values (see below)
```
Fill in `.env`:
- `MONGODB_URI`, `VAPI_PRIVATE_KEY`, `GROQ_API_KEY`, Google client id/secret.
- `VAPI_WEBHOOK_SECRET` → invent a long random string.
- All the **AGENCY DETAILS** (AGENT_NAME, AGENCY_NAME, FOUNDER_NAME, FLAGSHIP_PROOF, etc.) — these fill the system prompt. Only claim things the client can back up.

Get the Google refresh token (one time):
```powershell
npm run google:auth
```
Open the printed URL, sign in **as the founder**, approve, then paste the printed `GOOGLE_REFRESH_TOKEN` into `.env`.

### 3. Expose the server so Vapi can reach the webhook
Vapi runs in the cloud, so it needs a **public https URL** to call your tools. For local dev use [ngrok](https://ngrok.com) (free):
```powershell
# in a second terminal
ngrok http 8080
```
Copy the `https://....ngrok-free.app` URL into `SERVER_PUBLIC_URL` in `.env`.
Then start the server:
```powershell
npm run dev
```

### 4. Provision the Vapi assistant (creates it from your prompt + tools)
```powershell
npm run provision
```
This creates the assistant (Groq model + Deepgram voice + the two calendar tools wired to your webhook) and prints a `VITE_VAPI_ASSISTANT_ID`. Copy it.

> Re-run after editing the prompt: `VAPI_ASSISTANT_ID=<id> npm run provision` to update in place.

### 5. Configure & run the client
```powershell
cd "..\client"
npm install
copy .env.example .env       # set VITE_VAPI_PUBLIC_KEY + VITE_VAPI_ASSISTANT_ID + VITE_API_URL
npm run dev
```
Open http://localhost:5173 → **Start call** → talk. Try: *"Hi, I'm planning a product launch across three cities next month."*

The agent will qualify you, check the founder's real calendar, offer two slots, collect your details, and **create a real Google Calendar invite**. Booked consults appear under **Leads & bookings**.

---

## How the booking actually works (the important part)

1. Prospect names a day → the LLM calls **`checkAvailability`** → Vapi POSTs to `/api/vapi/webhook` → we query Google `freebusy`, compute open slots inside business hours, return two options.
2. Prospect picks one + gives details → the LLM calls **`scheduleAppointment`** → we `events.insert` with `sendUpdates: "all"` so **prospect + founder both get an email invite**, and we save a `Booking` + `Lead` in Mongo.
3. At call end, Vapi sends an **`end-of-call-report`** → we store the transcript, summary, and qualification fields on the `Lead`.

The webhook returns the exact shape Vapi expects: `{ results: [{ toolCallId, result }] }`.

---

## Going to production / phone calls
- **Web widget** (this app) is the cheapest way to demo and iterate — no telephony needed.
- For a **phone number**: grab a free Vapi number (great for testing) or connect Twilio.
- **India calling caveat:** inbound/outbound on *Indian* numbers needs KYC/DLT regulatory steps with the telephony provider. Use the web widget + a free Vapi number for demos; plan proper Indian telephony for live India calling.
- Deploy the server free on **Render / Railway / Fly**, the client on **Vercel / Netlify**. Set `SERVER_PUBLIC_URL` to the deployed server URL and re-run `npm run provision`.

## Tuning
- **Sharper sales nuance:** in `server/src/data/assistantConfig.js` swap the model to `openai`/`gpt-4o` (needs your OpenAI key in Vapi) — Groq stays free and is plenty for this script.
- **Premium Indian voice:** change the `voice` block to an ElevenLabs Indian-English voice (costs a little) for higher conversion. Deepgram Aura (default) is the cheap option.
- **Edit the script:** all prompt text lives in `buildSystemPrompt()` — change wording, then re-provision.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Agent offers times but never books | `SERVER_PUBLIC_URL` wrong/unreachable, or ngrok restarted (URL changes each run → re-provision). |
| "bad secret" 401 in server logs | `VAPI_WEBHOOK_SECRET` differs between `.env` and the provisioned assistant → re-provision. |
| No calendar invite arrives | `GOOGLE_REFRESH_TOKEN` missing/expired (re-run `npm run google:auth`); check Calendar API is enabled. |
| Mic doesn't work | Use Chrome/Edge and allow microphone permission; site must be `localhost` or https. |
| Dashboard empty | Server can't reach Mongo — check `MONGODB_URI` and Atlas IP allowlist (add `0.0.0.0/0` for testing). |
```
