/**
 * One-time helper to get a Google Calendar REFRESH TOKEN for the founder's account.
 *
 *   1. In Google Cloud Console: enable the "Google Calendar API",
 *      create an OAuth 2.0 Client ID (type: Web application),
 *      add redirect URI:  http://localhost:8080/oauth2callback
 *   2. Put GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI in server/.env
 *   3. Run:  npm run google:auth
 *   4. Open the printed URL, sign in as the FOUNDER, approve.
 *   5. Copy the printed refresh token into GOOGLE_REFRESH_TOKEN in server/.env
 */
import "dotenv/config";
import http from "node:http";
import { google } from "googleapis";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.error("Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI in server/.env first.");
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forces a refresh_token to be returned
  scope: SCOPES,
});

const port = Number(new URL(GOOGLE_REDIRECT_URI).port || 8080);

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/oauth2callback")) {
    res.writeHead(404).end();
    return;
  }
  const code = new URL(req.url, GOOGLE_REDIRECT_URI).searchParams.get("code");
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h2>✅ Done. You can close this tab and return to the terminal.</h2>");

    console.log("\n────────────────────────────────────────────");
    if (tokens.refresh_token) {
      console.log("✅ Copy this into server/.env:\n");
      console.log("GOOGLE_REFRESH_TOKEN=" + tokens.refresh_token);
    } else {
      console.log("⚠️ No refresh_token returned. Revoke prior access at");
      console.log("   https://myaccount.google.com/permissions and run again.");
    }
    console.log("────────────────────────────────────────────\n");
    setTimeout(() => process.exit(0), 500);
  } catch (e) {
    res.writeHead(500).end("Error: " + e.message);
    console.error(e);
  }
});

server.listen(port, () => {
  console.log("\nOpen this URL in your browser, sign in as the FOUNDER, and approve:\n");
  console.log(authUrl + "\n");
  console.log(`Waiting for the redirect on ${GOOGLE_REDIRECT_URI} ...`);
});
