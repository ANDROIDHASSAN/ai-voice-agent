import { useEffect, useState } from "react";

// Empty default = same-origin relative calls (Vercel-only). Local dev sets
// VITE_API_URL=http://localhost:8787 in client/.env.
const API = import.meta.env.VITE_API_URL || "";

export default function LeadsDashboard() {
  const [tab, setTab] = useState("bookings");
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const [l, b] = await Promise.all([
        fetch(`${API}/api/leads`).then((r) => r.json()),
        fetch(`${API}/api/bookings`).then((r) => r.json()),
      ]);
      setLeads(Array.isArray(l) ? l : []);
      setBookings(Array.isArray(b) ? b : []);
    } catch (e) {
      setErr("Couldn't reach the API. Is the server running?");
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const fmt = (iso) =>
    iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <div className="dash">
      <div className="dash__tabs">
        <button className={tab === "bookings" ? "active" : ""} onClick={() => setTab("bookings")}>
          Booked consults ({bookings.length})
        </button>
        <button className={tab === "leads" ? "active" : ""} onClick={() => setTab("leads")}>
          All leads ({leads.length})
        </button>
        <button className="refresh" onClick={load}>
          ↻
        </button>
      </div>

      {err && <p className="error">{err}</p>}

      {tab === "bookings" ? (
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Company</th>
              <th>Contact</th>
              <th>Event</th>
              <th>Invite</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{fmt(b.startDateTime)}</td>
                <td>{b.company || "—"}</td>
                <td>
                  {b.name}
                  <br />
                  <small>{b.email}</small>
                </td>
                <td>{b.eventType || "—"}</td>
                <td>
                  {b.htmlLink ? (
                    <a href={b.htmlLink} target="_blank" rel="noreferrer">
                      open
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!bookings.length && (
              <tr>
                <td colSpan="5" className="empty">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Status</th>
              <th>Contact</th>
              <th>Event / scale</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l._id}>
                <td>{fmt(l.createdAt)}</td>
                <td>
                  <span className={`tag tag--${l.status}`}>{l.status}</span>
                </td>
                <td>
                  {l.name || "—"}
                  <br />
                  <small>{l.email || l.phone || ""}</small>
                </td>
                <td>
                  {l.eventType || "—"}
                  {l.scale ? ` · ${l.scale}` : ""}
                </td>
                <td className="summary">{l.summary || "—"}</td>
              </tr>
            ))}
            {!leads.length && (
              <tr>
                <td colSpan="5" className="empty">
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
