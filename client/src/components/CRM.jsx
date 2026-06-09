import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { AgentIcon } from "../lib/icons.jsx";

const API = import.meta.env.VITE_API_URL || "";
const LEAD_STATUSES = ["new", "qualified", "booked", "callback", "not_fit"];

export default function CRM() {
  const [stats, setStats] = useState({ totals: {}, perAgent: [] });
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [agentFilter, setAgentFilter] = useState("");
  const [tab, setTab] = useState("bookings");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    const qs = agentFilter ? `?agent=${agentFilter}` : "";
    try {
      const [s, l, b] = await Promise.all([
        fetch(`${API}/api/stats`).then((r) => r.json()),
        fetch(`${API}/api/leads${qs}`).then((r) => r.json()),
        fetch(`${API}/api/bookings${qs}`).then((r) => r.json()),
      ]);
      setStats(s && s.perAgent ? s : { totals: {}, perAgent: [] });
      setLeads(Array.isArray(l) ? l : []);
      setBookings(Array.isArray(b) ? b : []);
    } catch { setErr("Couldn't reach the API."); }
  }, [agentFilter]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const setLeadStatus = async (id, status) => {
    await fetch(`${API}/api/leads/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  };
  const cancelBooking = async (id) => {
    if (!confirm("Cancel this booking? The slot reopens.")) return;
    await fetch(`${API}/api/bookings/${id}/cancel`, { method: "PATCH" });
    load();
  };
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

  return (
    <section className="crm wrap">
      <h2>CRM</h2>
      <p className="sub">Live across all 8 agents — leads, bookings, conversion.</p>

      <div className="kpis">
        <div className="kpi"><span>{stats.totals?.leads || 0}</span><label>Total leads</label></div>
        <div className="kpi"><span>{stats.totals?.bookings || 0}</span><label>Bookings</label></div>
      </div>

      <div className="astats">
        <button className={`astat ${!agentFilter ? "on" : ""}`} onClick={() => setAgentFilter("")}>
          <b>All agents</b>
        </button>
        {stats.perAgent?.map((a) => (
          <button key={a.key} className={`astat ${agentFilter === a.key ? "on" : ""}`} onClick={() => setAgentFilter(a.key)}>
            <span className="astat__ic" style={{ background: a.color }}><AgentIcon agentKey={a.key} size={16} /></span>
            <span><b>{a.brand}</b><small>{a.leads} leads · {a.bookings} booked · {a.conversion}%</small></span>
          </button>
        ))}
      </div>

      {err && <p className="err-line">{err}</p>}

      <div className="tabs">
        <button className={tab === "bookings" ? "on" : ""} onClick={() => setTab("bookings")}>Bookings ({bookings.length})</button>
        <button className={tab === "leads" ? "on" : ""} onClick={() => setTab("leads")}>Leads ({leads.length})</button>
        <button className="refresh" onClick={load}><RefreshCw size={13} /></button>
      </div>

      {tab === "bookings" ? (
        <table className="table">
          <thead><tr><th>When</th><th>Agent</th><th>Service</th><th>Contact</th><th>Lang</th><th></th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id} className={b.status === "cancelled" ? "row--off" : ""}>
                <td>{fmt(b.startDateTime)}</td>
                <td>{b.agentKey}</td>
                <td>{b.serviceName || "—"}</td>
                <td>{b.name}<br /><small>{b.phone || b.email}</small></td>
                <td>{b.language || "—"}</td>
                <td>{b.status === "confirmed"
                  ? <button className="mini danger" onClick={() => cancelBooking(b._id)}>Cancel</button>
                  : <span className="pill">cancelled</span>}</td>
              </tr>
            ))}
            {!bookings.length && <tr><td colSpan="6" className="empty">No bookings yet.</td></tr>}
          </tbody>
        </table>
      ) : (
        <table className="table">
          <thead><tr><th>When</th><th>Agent</th><th>Contact</th><th>Interest</th><th>Status</th><th>Summary</th></tr></thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l._id}>
                <td>{fmt(l.createdAt)}</td>
                <td>{l.agentKey || "—"}</td>
                <td>{l.name || "—"}<br /><small>{l.email || l.phone || ""}</small></td>
                <td>{l.interest || "—"}</td>
                <td>
                  <select className="statussel" value={l.status} onChange={(e) => setLeadStatus(l._id, e.target.value)}>
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="summary">{l.summary || "—"}</td>
              </tr>
            ))}
            {!leads.length && <tr><td colSpan="6" className="empty">No leads yet.</td></tr>}
          </tbody>
        </table>
      )}
    </section>
  );
}
