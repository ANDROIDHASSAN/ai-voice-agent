import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Cpu } from "lucide-react";
import IntroAnimation from "./components/IntroAnimation.jsx";
import AgentGallery from "./components/AgentGallery.jsx";
import CRM from "./components/CRM.jsx";

export default function App() {
  const [view, setView] = useState("demos");
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem("tc_intro_seen"));

  const endIntro = () => {
    sessionStorage.setItem("tc_intro_seen", "1");
    setShowIntro(false);
  };

  return (
    <div className="app">
      <AnimatePresence>
        {showIntro && <IntroAnimation key="intro" onDone={endIntro} />}
      </AnimatePresence>

      <header className="topbar">
        <div className="wrap topbar__in">
          <div className="brand">
            <span className="brand__mark"><Cpu size={16} strokeWidth={2} /></span>
            TrueCode<span className="brand__ai">AI</span>
          </div>
          <nav className="nav">
            <button className={view === "demos" ? "on" : ""} onClick={() => setView("demos")}>Demos</button>
            <button className={view === "crm" ? "on" : ""} onClick={() => setView("crm")}>CRM</button>
          </nav>
        </div>
      </header>

      <main>{view === "demos" ? <AgentGallery /> : <CRM />}</main>

      <footer>
        <div className="wrap footer__in">
          <span>© 2026 TrueCode AI — Voice Agent Studio</span>
          <span>EN · हिंदी · मराठी</span>
        </div>
      </footer>
    </div>
  );
}
