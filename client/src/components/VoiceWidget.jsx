import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID;

export default function VoiceWidget() {
  const vapiRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | connecting | live | ended
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState([]); // {role, text}
  const [error, setError] = useState("");

  useEffect(() => {
    if (!PUBLIC_KEY) {
      setError("Missing VITE_VAPI_PUBLIC_KEY in client/.env");
      return;
    }
    const vapi = new Vapi(PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("call-start", () => setStatus("live"));
    vapi.on("call-end", () => {
      setStatus("ended");
      setVolume(0);
    });
    vapi.on("volume-level", (v) => setVolume(v));
    vapi.on("error", (e) => {
      console.error(e);
      setError(e?.errorMsg || e?.message || "Call error");
      setStatus("idle");
    });
    vapi.on("message", (msg) => {
      // Live transcript stream
      if (msg.type === "transcript" && msg.transcriptType === "final") {
        setTranscript((t) => [...t, { role: msg.role, text: msg.transcript }]);
      }
    });

    return () => {
      try {
        vapi.stop();
      } catch {}
    };
  }, []);

  const start = async () => {
    setError("");
    setTranscript([]);
    if (!ASSISTANT_ID) {
      setError("Missing VITE_VAPI_ASSISTANT_ID — run `npm run provision` in the server.");
      return;
    }
    setStatus("connecting");
    try {
      await vapiRef.current.start(ASSISTANT_ID);
    } catch (e) {
      setError(e?.message || "Could not start the call");
      setStatus("idle");
    }
  };

  const stop = () => vapiRef.current?.stop();

  const toggleMute = () => {
    const next = !muted;
    vapiRef.current?.setMuted(next);
    setMuted(next);
  };

  const live = status === "live";

  return (
    <div className="widget">
      <div className={`orb ${live ? "orb--live" : ""}`} style={{ "--vol": volume }}>
        <div className="orb__core" />
      </div>

      <p className="status">
        {status === "idle" && "Ready to talk"}
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
            <button className="btn" onClick={toggleMute}>
              {muted ? "🔇 Unmute" : "🎙️ Mute"}
            </button>
            <button className="btn btn--danger" onClick={stop}>
              ✕ End call
            </button>
          </>
        )}
      </div>

      {error && <p className="error">⚠️ {error}</p>}

      {transcript.length > 0 && (
        <div className="transcript">
          {transcript.map((m, i) => (
            <div key={i} className={`bubble bubble--${m.role}`}>
              <span className="bubble__who">{m.role === "assistant" ? "Agent" : "You"}</span>
              {m.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
