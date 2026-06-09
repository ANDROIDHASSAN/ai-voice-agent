import { google } from "googleapis";

/**
 * Google Calendar service (FREE — native Google Calendar API).
 * Uses an OAuth2 refresh token for the founder's account.
 * Get the refresh token once with `npm run google:auth`.
 */

function getCalendarClient() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    GOOGLE_REFRESH_TOKEN,
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error(
      "Google Calendar not configured. Set GOOGLE_CLIENT_ID/SECRET and run `npm run google:auth` to get GOOGLE_REFRESH_TOKEN."
    );
  }

  const oAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  oAuth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: "v3", auth: oAuth2Client });
}

const CALENDAR_ID = () => process.env.GOOGLE_CALENDAR_ID || "primary";
const TZ = () => process.env.TIMEZONE || "Asia/Kolkata";

/**
 * Find open slots inside [startDateTime, endDateTime], within business hours,
 * that don't collide with existing busy blocks. Returns up to `limit` slots.
 */
export async function checkAvailability({
  startDateTime,
  endDateTime,
  durationMinutes,
  limit = 4,
}) {
  const calendar = getCalendarClient();
  const tz = TZ();
  const duration = Number(durationMinutes || process.env.CONSULT_LENGTH_MIN || 30);

  const timeMin = new Date(startDateTime);
  const timeMax = new Date(endDateTime);

  const fb = await calendar.freebusy.query({
    requestBody: {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: tz,
      items: [{ id: CALENDAR_ID() }],
    },
  });

  const busy = fb.data.calendars?.[CALENDAR_ID()]?.busy || [];

  const bhStart = Number(process.env.BUSINESS_HOURS_START || 10);
  const bhEnd = Number(process.env.BUSINESS_HOURS_END || 19);

  // Walk the window in `duration`-minute steps and keep the free ones.
  const slots = [];
  const stepMs = duration * 60 * 1000;
  // We compare business hours in the target timezone using Intl.
  const hourInTz = (d) =>
    Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        hour: "2-digit",
        hour12: false,
      }).format(d)
    );

  for (
    let t = timeMin.getTime();
    t + stepMs <= timeMax.getTime() && slots.length < limit;
    t += stepMs
  ) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t + stepMs);

    const startHour = hourInTz(slotStart);
    if (startHour < bhStart || startHour >= bhEnd) continue; // outside business hours

    const overlaps = busy.some((b) => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return slotStart.getTime() < be && slotEnd.getTime() > bs;
    });
    if (overlaps) continue;

    slots.push({
      startDateTime: slotStart.toISOString(),
      endDateTime: slotEnd.toISOString(),
      timeZone: tz,
      label: humanSlot(slotStart, tz),
    });
  }

  return slots;
}

/**
 * Create the consultation event and email invites to prospect + founder.
 */
export async function createEvent({
  summary,
  description,
  startDateTime,
  endDateTime,
  attendeeEmails = [],
}) {
  const calendar = getCalendarClient();
  const tz = TZ();

  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID(),
    sendUpdates: "all", // email invites to everyone
    requestBody: {
      summary,
      description,
      start: { dateTime: new Date(startDateTime).toISOString(), timeZone: tz },
      end: { dateTime: new Date(endDateTime).toISOString(), timeZone: tz },
      attendees: attendeeEmails.filter(Boolean).map((email) => ({ email })),
      reminders: { useDefault: true },
    },
  });

  return {
    googleEventId: res.data.id,
    htmlLink: res.data.htmlLink,
    start: res.data.start?.dateTime,
    end: res.data.end?.dateTime,
  };
}

/** "Wednesday the 11th of June at 4:00 pm" style label for speaking. */
export function humanSlot(date, tz = TZ()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
