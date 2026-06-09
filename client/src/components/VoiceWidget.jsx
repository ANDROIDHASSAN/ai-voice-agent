import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { X, Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { AgentIcon } from "../lib/icons.jsx";
import { VOICE_BY_LANG, LANG_NAME, LANG_LABEL } from "../lib/voiceConfig.js";

const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;

export default function VoiceWidget({ agent, onClose }) {
  const vapiRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [lang, setLang] = useState("en");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!PUBLIC_KEY) { setError("Missing VITE_VAPI_PUBLIC_KEY"); return; }
    const vapi = new Vapi(PUBLIC_KEY);
    vapiRef.current = vapi;
    vapi.on("call-start", () => { setError(""); setStatus("live"); });
    vapi.on("call-end", () => { setStatus("ended"); setVolume(0); });
    vapi.on("volume-level", (v) => setVolume(v));
    vapi.on("error", (e) => {
      const raw = e?.errorMsg || e?.error?.message || e?.message || JSON.stringify(e || {});
      const text = (typeof raw === "string" ? raw : JSON.stringify(raw)).toLowerCase();
      if (text.includes("daily") || text.includes("websocket") || text.includes("ejection") ||
          text.includes("meeting has ended") || text.includes("network")) {
        setError("Your network is blocking the call audio (daily.co). Fix: set DNS to 1.1.1.1, switch Wi-Fi / use mobile data, or turn on a VPN — then retry.");
      } else {
        setError(typeof raw === "string" ? raw : "Call error");
      }
      setStatus("idle");
    });
    vapi.on("message", (m) => {
      if (m.type === "transcript" && m.transcriptType === "final") {
        setTranscript((t) => [...t, { role: m.role, text: m.transcript }]);
      }
    });
    return () => { try { vapi.stop(); } catch {} };
  }, []);

  const start = async () => {
    setError(""); setTranscript([]);
    if (!agent?.assistantId) { setError("This agent isn't provisioned yet."); return; }
    setStatus("connecting");
    try {
      const overrides = {
        firstMessage: agent.greetings?.[lang] || agent.greetings?.en,
        variableValues: { language: LANG_NAME[lang] },
      };
      // Hindi/Marathi: swap to an Azure voice that speaks the language.
      // English uses the assistant's default voice (no Azure needed).
      if (VOICE_BY_LANG[lang]) overrides.voice = VOICE_BY_LANG[lang];
      await vapiRef.current.start(agent.assistantId, overrides);
    } catch (e) { setError(e?.message || "Could not start the call"); setStatus("idle"); }
  };
  const stop = () => vapiRef.current?.stop();
  const toggleMute = () => { const n = !muted; vapiRef.current?.setMuted(n); setMuted(n); };
  const live = status === "live";

  return (
    <div className="panel" style={{ "--accent-c": agent.color }}>
      <button className="panel__x" onClick={onClose}><X size={18} /></button>

      <div className="panel__head">
        <span className="panel__icon"><AgentIcon agentKey={agent.key} size={24} /></span>
        <div>
          <h3>{agent.agentName} · {agent.brand}</h3>
          <p>{agent.industry}</p>
        </div>
      </div>

      {!live && status !== "connecting" && (
        <div className="langs">
          {["en", "hi", "mr"].map((l) => (
            <button key={l} className={lang === l ? "on" : ""} onClick={() => setLang(l)}>{LANG_LABEL[l]}</button>
          ))}
        </div>
      )}

      <div className="orb-wrap">
        <div className={`orb ${live ? "live" : ""}`} style={{ "--vol": volume }}>
          <div className="orb__core" />
        </div>
      </div>

      <p className="status">
        {status === "idle" && `Ready — tap to talk in ${LANG_LABEL[lang]}`}
        {status === "connecting" && "Connecting…"}
        {status === "live" && "Listening — speak naturally"}
        {status === "ended" && "Call ended"}
      </p>

      <div className="controls">
        {!live ? (
          <button className="btn btn--primary" onClick={start} disabled={status === "connecting"}>
            <Phone size={17} /> {status === "connecting" ? "Connecting…" : "Start call"}
          </button>
        ) : (
          <>
            <button className="btn" onClick={toggleMute}>
              {muted ? <MicOff size={17} /> : <Mic size={17} />} {muted ? "Unmute" : "Mute"}
            </button>
            <button className="btn btn--danger" onClick={stop}><PhoneOff size={17} /> End</button>
          </>
        )}
      </div>

      {error && <div className="note note--err">{error}</div>}

      {transcript.length > 0 && (
        <div className="transcript">
          {transcript.map((m, i) => (
            <div key={i} className={`bubble bubble--${m.role}`}>
              <span className="bubble__who">{m.role === "assistant" ? agent.agentName : "You"}</span>
              {m.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
