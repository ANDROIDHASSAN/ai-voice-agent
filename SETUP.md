# ðŸ“‹ Full Setup & Deployment Guide (follow top to bottom)

Two phases:
- **Phase A â€” Run it locally** (get the agent talking + booking on your machine).
- **Phase B â€” Deploy** (server â†’ Render, client â†’ Vercel).

Everything here is on free tiers. Budget ~45 minutes the first time.

Legend: ðŸ–¥ï¸ = run in a terminal, ðŸŒ = do it in a browser dashboard.

---

# PHASE A â€” Run locally

## A1. Create the free accounts & collect 8 secrets
Open these in browser tabs and grab each value into a scratch notepad:

| # | Service | What to copy | Where |
|---|---|---|---|
| 1 | **MongoDB Atlas** | connection string `MONGODB_URI` | mongodb.com/atlas â†’ free M0 cluster â†’ "Connect" â†’ "Drivers" |
| 2 | **Vapi** | **Public key** + **Private key** | dashboard.vapi.ai â†’ top-right / API Keys |
| 3 | **Groq** | API key (`gsk_...`) | console.groq.com/keys |
| 4 | **Google Cloud** | OAuth **Client ID** + **Client Secret** | console.cloud.google.com (steps below) |

### 1. MongoDB Atlas (free database)
1. ðŸŒ Sign up â†’ **Build a Database** â†’ **M0 (Free)** â†’ pick a region near you â†’ Create.
2. **Database Access** â†’ Add a user (username + password â€” remember them).
3. **Network Access** â†’ Add IP â†’ **Allow access from anywhere** (`0.0.0.0/0`) for testing.
4. **Database â†’ Connect â†’ Drivers** â†’ copy the string. Replace `<password>` with your user's password and add a db name, e.g.
   `mongodb+srv://me:MYPASS@cluster0.abcd.mongodb.net/voiceagent?retryWrites=true&w=majority`

### 2. Vapi (voice infrastructure â€” $10 free credit)
1. ðŸŒ Sign up at dashboard.vapi.ai (no card).
2. Copy your **Public Key** and **Private Key**.
3. **Provider Keys â†’ Groq â†’ paste your Groq key** (do step 3 first). This is the free BYOK path so Vapi runs Groq with *your* key.

### 3. Groq (free LLM)
1. ðŸŒ console.groq.com/keys â†’ **Create API Key** â†’ copy `gsk_...`.

### 4. Google Calendar API (free, real invites)
1. ðŸŒ console.cloud.google.com â†’ create a project (e.g. "voice-agent").
2. **APIs & Services â†’ Library** â†’ search **"Google Calendar API"** â†’ **Enable**.
3. **APIs & Services â†’ OAuth consent screen** â†’ choose **External** â†’ fill app name + your email â†’ **Save**. Under **Test users**, add the founder's Google email (and your own).
4. **APIs & Services â†’ Credentials â†’ Create Credentials â†’ OAuth client ID** â†’ Application type **Web application**.
   - Under **Authorized redirect URIs** add exactly: `http://localhost:8787/oauth2callback`
   - Create â†’ copy the **Client ID** and **Client secret**.

## A2. Configure the server
ðŸ–¥ï¸ In a terminal:
```powershell
cd "d:\truecodeai\voice bots\server"
copy .env.example .env
notepad .env
```
Fill every value from your scratch notepad. Minimum to start:
`MONGODB_URI`, `VAPI_PRIVATE_KEY`, `VAPI_WEBHOOK_SECRET` (invent a long random string), `GROQ_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FOUNDER_EMAIL`, and all the **AGENCY DETAILS** (AGENT_NAME, AGENCY_NAME, FOUNDER_NAME, CITY_HQ, YEARS, FLAGSHIP_PROOF, BRAND_PROOF).
Leave `SERVER_PUBLIC_URL` and `GOOGLE_REFRESH_TOKEN` for now.

## A3. Get the Google refresh token (one time)
ðŸ–¥ï¸
```powershell
npm run google:auth
```
- It prints a URL. Open it, **sign in as the founder**, approve the calendar permission.
- Back in the terminal it prints `GOOGLE_REFRESH_TOKEN=...` â†’ paste that line's value into `.env`.

> If it says "no refresh_token returned", go to myaccount.google.com/permissions, remove the app, and run again.

## A4. Make the server reachable by Vapi (ngrok)
Vapi is in the cloud and must call your webhook over https. Use ngrok (free).
1. ðŸŒ Sign up at ngrok.com, install it, run `ngrok config add-authtoken <token>` once.
2. ðŸ–¥ï¸ In a **second** terminal:
   ```powershell
   ngrok http 8787
   ```
3. Copy the `https://xxxx.ngrok-free.app` URL â†’ put it in `.env` as `SERVER_PUBLIC_URL`.

> âš ï¸ ngrok's free URL changes every time you restart it. If you restart ngrok, update `.env` and **re-run provision (A6)**.

## A5. Start the server
ðŸ–¥ï¸ (first terminal)
```powershell
npm run dev
```
You should see `ðŸš€ Server on http://localhost:8787` and `âœ… MongoDB connected`.

## A6. Provision the Vapi assistant
ðŸ–¥ï¸ (a third terminal, or stop nothing â€” just open new)
```powershell
cd "d:\truecodeai\voice bots\server"
npm run provision
```
It creates the assistant (Groq + Deepgram voice + the 2 calendar tools wired to your ngrok webhook) and prints:
```
VITE_VAPI_ASSISTANT_ID=xxxxxxxx
```
Copy that.

## A7. Configure & run the client
ðŸ–¥ï¸ (new terminal)
```powershell
cd "d:\truecodeai\voice bots\client"
copy .env.example .env
notepad .env
```
Set:
- `VITE_VAPI_PUBLIC_KEY` = your Vapi **public** key
- `VITE_VAPI_ASSISTANT_ID` = the id from A6
- `VITE_API_URL` = `http://localhost:8787`

Then:
```powershell
npm run dev
```
ðŸŒ Open **http://localhost:5173** â†’ **Start call** â†’ allow the microphone â†’ talk.

**Test script:** *"Hi, I'm planning a three-city product launch next month, budget around 15 lakh."* The agent should qualify you, check the real calendar, offer two slots, take your name/company/email, and you'll get a **real Google Calendar invite**. The booking shows under **Leads & bookings**.

âœ… Phase A complete.

---

# PHASE B â€” Deploy (server â†’ Render, client â†’ Vercel)

First push this project to a **GitHub repo** (both `server/` and `client/`). Render and Vercel deploy from GitHub.

ðŸ–¥ï¸
```powershell
cd "d:\truecodeai\voice bots"
git init
git add .
git commit -m "voice agent"
# create a repo on github.com, then:
git remote add origin https://github.com/<you>/<repo>.git
git branch -M main
git push -u origin main
```
(`.gitignore` already excludes `.env` and `node_modules` â€” your secrets won't be pushed.)

## B1. Deploy the SERVER to Render (free)
1. ðŸŒ render.com â†’ **New â†’ Web Service** â†’ connect your GitHub repo.
2. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - Plan: **Free**
   (Or use **New â†’ Blueprint** â€” it auto-reads `server/render.yaml`.)
3. **Environment** â†’ add every var from your server `.env` **except** set:
   - `SERVER_PUBLIC_URL` = your Render URL (you'll know it after first deploy, e.g. `https://voice-agent-server.onrender.com`) â€” add it, then redeploy.
   - `CLIENT_ORIGIN` = your Vercel URL (fill after B2, e.g. `https://your-app.vercel.app`).
4. Deploy. Visit `https://<your-service>.onrender.com/health` â†’ should return `{"ok":true}`.

> âš ï¸ **Update Google redirect URI for prod:** the refresh token you already have keeps working, so you usually don't need to redo Google. You do **not** need to add the Render URL to Google unless you re-run `google:auth` from the server.

## B2. Deploy the CLIENT to Vercel (free)
1. ðŸŒ vercel.com â†’ **Add New â†’ Project** â†’ import the same repo.
2. Settings:
   - **Root Directory:** `client`
   - Framework preset: **Vite** (auto-detected; `client/vercel.json` already sets build/output).
3. **Environment Variables** (Production):
   - `VITE_VAPI_PUBLIC_KEY` = Vapi public key
   - `VITE_VAPI_ASSISTANT_ID` = (set after B3)
   - `VITE_API_URL` = your Render URL `https://<service>.onrender.com`
4. Deploy â†’ you get `https://your-app.vercel.app`.
5. Go back to **Render â†’ env** and set `CLIENT_ORIGIN` to this Vercel URL â†’ redeploy (for CORS).

## B3. Re-provision the assistant to point at the LIVE webhook
The tools must call your Render webhook, not ngrok. From your machine:
ðŸ–¥ï¸
```powershell
cd "d:\truecodeai\voice bots\server"
notepad .env   # set SERVER_PUBLIC_URL=https://<service>.onrender.com
$env:VAPI_ASSISTANT_ID="<the id from A6>"
npm run provision   # updates the existing assistant in place
```
(Leave `VITE_VAPI_ASSISTANT_ID` the same â€” it's the same assistant, just repointed.)
Put that same assistant id into Vercel's `VITE_VAPI_ASSISTANT_ID` env and redeploy the client.

## B4. Test production
ðŸŒ Open your Vercel URL â†’ Start call â†’ book a consult â†’ confirm the invite email + the Render `/api/bookings` and the dashboard.

âœ… Live and functional.

---

## âš ï¸ Free-tier gotchas (read these)
- **Render free spins down** after ~15 min idle; the first request (incl. a Vapi tool call) can take ~50s to cold-start, which may stall a live call. For demos, hit `/health` to warm it first, or upgrade to the $7 plan for always-on.
- **Vapi $10 credit** â‰ˆ 40â€“65 test minutes on this stack. Web-widget testing is the cheapest.
- **ngrok URL changes** on restart â†’ re-provision (only matters in local Phase A).
- **India phone numbers** need KYC/DLT telephony setup. The web widget + a free Vapi number are fine for demos.
- **MongoDB Atlas** keep the `0.0.0.0/0` network rule (Render's IPs are dynamic on free tier).


