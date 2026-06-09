import { useState } from "react";
import AgentGallery from "./components/AgentGallery.jsx";
import CRM from "./components/CRM.jsx";

export default function App() {
  const [view, setView] = useState("demos"); // demos | crm

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">◉</span> TrueCode<span className="brand__ai">AI</span>
        </div>
        <nav>
          <button className={view === "demos" ? "navbtn active" : "navbtn"} onClick={() => setView("demos")}>
            Demos
          </button>
          <button className={view === "crm" ? "navbtn active" : "navbtn"} onClick={() => setView("crm")}>
            CRM
          </button>
        </nav>
      </header>

      <main>{view === "demos" ? <AgentGallery /> : <CRM />}</main>

      <footer>
        Built by <b>TrueCode AI</b> · Voice agents · Multilingual (EN · हिंदी · मराठी) · Real booking + CRM
      </footer>
    </div>
  );
}
