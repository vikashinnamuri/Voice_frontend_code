import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { IconHistory, IconMenu, IconMic, IconOverview, IconQueue, IconClose } from "./Icons";
import { getVoiceConfig } from "../api/voice";
import { useAsync } from "../hooks/useAsync";
import { Logo } from "./Logo";

const NAV = [
  { to: "/", label: "Overview", icon: IconOverview, end: true },
  { to: "/live", label: "Live receptionist", icon: IconMic },
  { to: "/history", label: "Call history", icon: IconHistory },
  { to: "/review", label: "Staff review queue", icon: IconQueue },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const voice = useAsync(getVoiceConfig, []).data;
  const voiceLabel = !voice ? "Voice…" : voice.voice_transport === "livekit" ? "Voice: LiveKit + Gemini Live" : voice.voice_transport === "direct" ? "Voice: Gemini Live" : "Voice: browser speech";
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="mobile-bar">
        <Logo />
        <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="sidebar" aria-label={open ? "Close menu" : "Open menu"}>{open ? <IconClose /> : <IconMenu />}</button>
      </header>
      <aside id="sidebar" className={`sidebar${open ? " open" : ""}`}>
        <div className="sidebar-logo"><Logo light /></div>
        <nav aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`} onClick={() => setOpen(false)}>
              <Icon /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot"><p>Calls are answered by the AI receptionist and saved here for your team to review.</p></div>
      </aside>
      <div className="content">
        <div className="topbar">
          <span className="chip chip-on"><i className="status-dot on" aria-hidden="true" /> {voiceLabel}</span>
        </div>
        <main id="main" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  );
}
