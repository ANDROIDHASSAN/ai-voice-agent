import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu } from "lucide-react";
import { SERVICES } from "../lib/icons.jsx";

/**
 * Cinematic, professional motion-graphics intro.
 * Phases: brand → tagline → services montage → handoff, then onDone().
 * White background, black ink, solid accent — no gradients.
 */
const PHASE_MS = [1600, 1700, 2600, 1500]; // duration of each phase
const ease = [0.22, 1, 0.36, 1];

export default function IntroAnimation({ onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (phase >= PHASE_MS.length) { onDone(); return; }
    const t = setTimeout(() => setPhase((p) => p + 1), PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  const total = PHASE_MS.reduce((a, b) => a + b, 0);

  return (
    <motion.div className="intro" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
      <button className="intro__skip" onClick={onDone}>Skip intro →</button>

      <div className="intro__stage">
        <AnimatePresence mode="wait">
          {/* Phase 0 — brand reveal */}
          {phase === 0 && (
            <motion.div key="brand" exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}>
              <motion.div
                className="intro__mark"
                initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 0.6, ease }}
              >
                <Cpu size={34} strokeWidth={1.75} />
              </motion.div>
              <motion.p
                className="intro__eyebrow"
                initial={{ opacity: 0, letterSpacing: "0.5em" }}
                animate={{ opacity: 1, letterSpacing: "0.26em" }}
                transition={{ duration: 0.7, delay: 0.15 }}
              >
                AI · Software Studio
              </motion.p>
              <h1 className="intro__word">
                {"TrueCode".split("").map((c, i) => (
                  <motion.span key={i} style={{ display: "inline-block" }}
                    initial={{ y: "110%", opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.25 + i * 0.04, ease }}>
                    {c}
                  </motion.span>
                ))}
                <span className="u"> AI</span>
              </h1>
            </motion.div>
          )}

          {/* Phase 1 — tagline */}
          {phase === 1 && (
            <motion.div key="tag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}>
              <motion.p className="intro__eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
                What we do
              </motion.p>
              <h2 className="intro__tag" style={{ marginTop: 14 }}>
                {["We build", "anything", "in tech."].map((w, i) => (
                  <motion.span key={i} style={{ display: "block" }}
                    initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.12, ease }}>
                    {w === "anything" ? <span className="u">{w}</span> : w}
                  </motion.span>
                ))}
              </h2>
            </motion.div>
          )}

          {/* Phase 2 — services montage */}
          {phase === 2 && (
            <motion.div key="svc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>
              <p className="intro__eyebrow" style={{ marginBottom: 24 }}>Our services</p>
              <div className="intro__services">
                {SERVICES.map((s, i) => (
                  <motion.span key={s.label} className="svc"
                    initial={{ y: 24, opacity: 0, filter: "blur(6px)" }}
                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.45, delay: i * 0.13, ease }}>
                    <span className="svc__ic"><s.Icon size={28} strokeWidth={1.75} /></span>
                    {s.label}
                    {i < SERVICES.length - 1 && <span style={{ color: "var(--line)", marginLeft: 4 }}>·</span>}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Phase 3 — handoff */}
          {phase === 3 && (
            <motion.div key="hand" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease }}>
              <p className="intro__eyebrow">Now — experience it</p>
              <h2 className="intro__tag" style={{ marginTop: 14 }}>
                Talk to our <span className="u">voice agents.</span>
              </h2>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.div className="intro__progress"
        initial={{ width: 0 }} animate={{ width: "100%" }}
        transition={{ duration: total / 1000, ease: "linear" }} />
    </motion.div>
  );
}
