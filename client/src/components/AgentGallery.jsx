import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Mic } from "lucide-react";
import { AgentIcon } from "../lib/icons.jsx";
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
    <>
      {/* Hero */}
      <section className="hero">
        <div className="wrap">
          <span className="eyebrow hero__eyebrow"><span className="dot" /> TrueCode AI · Voice Agent Studio</span>
          <h1>Voice agents that talk, qualify, and <span className="u">close.</span></h1>
          <p className="lead">
            Pick an industry and talk to a live demo — in English, हिंदी, or मराठी. Each agent
            qualifies leads and books real appointments. This is what we build for you.
          </p>
          <div className="hero__langs">
            <span><b>8</b> live agents</span>
            <span><b>3</b> languages</span>
            <span><b>Real</b> booking + CRM</span>
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="sec wrap">
        <div className="sec__head">
          <h2>Live demo agents</h2>
          <span className="count">[ {agents.length || 8} ]</span>
        </div>

        {err && <p className="err-line">{err}</p>}
        {loading && <p className="muted center">Loading agents…</p>}

        <div className="grid">
          {agents.map((a, i) => (
            <motion.button
              key={a.key} className="card" onClick={() => setActive(a)}
              style={{ "--accent-c": a.color }}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: (i % 4) * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="card__accent" />
              <span className="card__icon"><AgentIcon agentKey={a.key} size={24} /></span>
              <span className="card__industry">{a.industry}</span>
              <h3 className="card__brand">{a.brand}</h3>
              <p className="card__tag">{a.tagline}</p>
              <div className="card__foot">
                <span className="card__agent"><Mic size={14} strokeWidth={2} /> {a.agentName}</span>
                {a.assistantId ? (
                  <span className="card__cta">talk now <ArrowRight className="arr" size={13} strokeWidth={2.5} /></span>
                ) : (
                  <span className="card__cta off">offline</span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {active && (
        <div className="modal" onClick={(e) => e.target.classList.contains("modal") && setActive(null)}>
          <VoiceWidget agent={active} onClose={() => setActive(null)} />
        </div>
      )}
    </>
  );
}
