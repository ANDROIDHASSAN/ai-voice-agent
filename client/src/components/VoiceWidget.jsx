import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;

const LANG_NAME = { en: "English", hi: "Hindi", mr: "Marathi" };
const LANG_LABEL = { en: "English", hi: "हिंदी", mr: "मराठी" };

export default function VoiceWidget({ agent, onClose }) {
  const vapiRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | live | ended
  const [lang, setLang] = useState("en");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!PUBLIC_KEY) {
      setError("Missing VITE_VAPI_PUBLIC_KEY");
      return;
    }
    const vapi = new Vapi(PUBLIC_KEY);
    vapiRef.current = vapi;
    vapi.on("call-start", () => { setError(""); setStatus("live"); });
    vapi.on("call-end", () => { setStatus("ended"); setVolume(0); });
    vapi.on("volume-level", (v) => setVolume(v));
    vapi.on("error", (e) => {
      const raw = e?.errorMsg || e?.error?.message || e?.message || JSON.stringify(e || {});
      const text = (typeof raw === "string" ? raw : JSON.stringify(raw)).toLowerCase();
      // A network/DNS block of daily.co (Vapi's audio transport) is the most
      // common failure — give an actionable message instead of a cryptic one.
      if (text.includes("daily") || text.includes("websocket") || text.includes("ejection") ||
          text.includes("meeting has ended") || text.includes("network")) {
        setError(
          "Your network is blocking the call audio (daily.co). Fix: set your DNS to 1.1.1.1, " +
          "use a different Wi-Fi / mobile data, or turn on a VPN — then try again."
        );
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
    setError("");
    setTranscript([]);
    if (!agent?.assistantId) {
      setError("This agent isn't provisioned yet — run `npm run provision` in the server.");
      return;
    }
    setStatus("connecting");
    try {
      await vapiRef.current.start(agent.assistantId, {
        firstMessage: agent.greetings?.[lang] || agent.greetings?.en,
        variableValues: { language: LANG_NAME[lang] },
      });
    } catch (e) {
      setError(e?.message || "Could not start the call");
      setStatus("idle");
    }
  };

  const stop = () => vapiRef.current?.stop();
  const toggleMute = () => { const n = !muted; vapiRef.current?.setMuted(n); setMuted(n); };
  const live = status === "live";

  return (
    <div className="call-panel" style={{ "--accent": agent.color }}>
      <button className="call-panel__close" onClick={onClose}>✕</button>

      <div className="call-panel__head">
        <span className="call-panel__emoji">{agent.emoji}</span>
        <div>
          <h3>{agent.agentName} · {agent.brand}</h3>
          <p>{agent.industry}</p>
        </div>
      </div>

      {!live && status !== "connecting" && (
        <div className="lang-row">
          {["en", "hi", "mr"].map((l) => (
            <button key={l} className={`lang ${lang === l ? "lang--on" : ""}`} onClick={() => setLang(l)}>
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      )}

      <div className={`orb ${live ? "orb--live" : ""}`} style={{ "--vol": volume }}>
        <div className="orb__core" />
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
            {status === "connecting" ? "Connecting…" : "📞 Start call"}
          </button>
        ) : (
          <>
            <button className="btn" onClick={toggleMute}>{muted ? "🔇 Unmute" : "🎙️ Mute"}</button>
            <button className="btn btn--danger" onClick={stop}>✕ End call</button>
          </>
        )}
      </div>

      {error && <p className="error">⚠️ {error}</p>}

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
