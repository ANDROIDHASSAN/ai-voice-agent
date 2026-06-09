import { useState } from "react";
import VoiceWidget from "./components/VoiceWidget.jsx";
import LeadsDashboard from "./components/LeadsDashboard.jsx";

export default function App() {
  const [view, setView] = useState("call"); // call | dashboard

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="dot" /> Event &amp; PR Voice Agent
        </div>
        <nav>
          <button className={view === "call" ? "navbtn active" : "navbtn"} onClick={() => setView("call")}>
            Talk to the agent
          </button>
          <button
            className={view === "dashboard" ? "navbtn active" : "navbtn"}
            onClick={() => setView("dashboard")}
          >
            Leads &amp; bookings
          </button>
        </nav>
      </header>

      <main>
        {view === "call" ? (
          <section className="hero">
            <h1>Tell us about your event.</h1>
            <p className="sub">
              Press start and talk — our specialist will understand your vision and book you a free
              discovery consultation.
            </p>
            <VoiceWidget />
          </section>
        ) : (
          <LeadsDashboard />
        )}
      </main>

      <footer>Built on the free stack · Vapi · Groq · Google Calendar · MongoDB Atlas</footer>
    </div>
  );
}
