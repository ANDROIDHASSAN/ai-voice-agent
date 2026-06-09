// Vercel Serverless Function entry.
// Every request to /api/* is routed here (see root vercel.json) and handled by
// the same Express app used in local dev. An Express app is itself a
// (req, res) handler, so we can export it directly.
import app from "../server/src/app.js";

export default app;
