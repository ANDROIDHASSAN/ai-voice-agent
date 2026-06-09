import { useEffect, useState } from "react";
import VoiceWidget from "./VoiceWidget.jsx";

const API = import.meta.env.VITE_API_URL || "";

export default function AgentGallery() {
  const [agents, setAgents] = useState([]);
  const [active, setActive] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/agents`)
      .then((r) => r.json())
      .then((d) => setAgents(Array.isArray(d) ? d : []))
      .catch(() => setErr("Couldn't load agents. Is the API running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="gallery-wrap">
      <div className="hero">
        <span className="badge">TrueCode AI · Voice Agent Studio</span>
        <h1>Voice agents that talk, qualify, and <span className="grad">close</span>.</h1>
        <p className="sub">
          Pick an industry below and talk to a live demo — in English, हिंदी, or मराठी.
          Each agent books real appointments. This is what we can build for you.
        </p>
      </div>

      {err && <p className="error center">{err}</p>}
      {loading && <p className="center muted">Loading agents…</p>}

      <div className="grid">
        {agents.map((a) => (
          <button key={a.key} className="card" style={{ "--accent": a.color }} onClick={() => setActive(a)}>
            <div className="card__top">
              <span className="card__emoji">{a.emoji}</span>
              <span className="card__industry">{a.industry}</span>
            </div>
            <h3 className="card__brand">{a.brand}</h3>
            <p className="card__tag">{a.tagline}</p>
            <div className="card__foot">
              <span className="card__agent">🎙️ {a.agentName}</span>
              <span className={`card__status ${a.assistantId ? "on" : "off"}`}>
                {a.assistantId ? "Talk now →" : "Not provisioned"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className="modal" onClick={(e) => e.target.classList.contains("modal") && setActive(null)}>
          <VoiceWidget agent={active} onClose={() => setActive(null)} />
        </div>
      )}
    </section>
  );
}
