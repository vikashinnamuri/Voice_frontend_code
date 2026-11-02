import { Link } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { DemoBanner } from "../../components/DemoBanner";
import { IconMic, IconPhone, IconPhoneOff } from "../../components/Icons";
import { Badge, StatusBadge } from "../../components/Badges";
import type { VoiceConfig } from "../../types";
import { formatClock, formatDuration } from "../../utils/format";
import { CallerProfile } from "./CallerProfile";
import { LiveTranscript } from "./LiveTranscript";
import { useReceptionistCall } from "./useReceptionistCall";
import { VoiceOrb, type OrbState } from "./VoiceOrb";
import { speechSynthesisSupported } from "../../hooks/useSpeech";

// LiveKit is only needed when the server has credentials, so it is loaded on demand and kept out of the main bundle.
const LiveKitSession = lazy(() => import("./LiveKitSession").then((m) => ({ default: m.LiveKitSession })));

export function ReceptionistPanel({ config }: { config: VoiceConfig | null }) {
  const c = useReceptionistCall(config);
  const { state } = c;
  const [slow, setSlow] = useState(false); // LiveKit room joined but the voice agent hasn't shown up

  const active = state.phase === "active";
  const orb: OrbState = state.phase === "starting" || state.phase === "finishing" ? "connecting" : state.phase === "ended" ? "ended" : !active ? "idle" : state.speaking ? "speaking" : state.thinking ? "thinking" : "listening";
  const lk = c.transport === "livekit";
  useEffect(() => {
    setSlow(false);
    if (!active || !lk || !["connecting", "initializing", "disconnected"].includes(c.agentState)) return;
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, [active, lk, c.agentState]);
  const pct = state.progress.total ? Math.round((state.progress.collected / state.progress.total) * 100) : 0;

  return (
    <div className="live-grid">
      <div className="live-main">
        <section className="card voice-card" aria-label="Voice assistant">
          <div className="voice-top">
            <Badge tone={c.liveMode ? "blue" : "grey"}>{lk ? `LiveKit · Gemini Live${config?.gemini_voice ? ` · ${config.gemini_voice}` : ""}` : c.transport === "direct" ? `Gemini Live voice${config?.gemini_voice ? ` · ${config.gemini_voice}` : ""}` : "Browser voice (Gemini Live not configured)"}</Badge>
            <span className="room-status" aria-live="polite">
              <i className={`status-dot ${active && (!lk || c.roomStatus === "connected") ? "on" : ""}`} aria-hidden="true" />
              {lk ? `Room: ${active ? c.roomStatus : "not connected"}` : c.liveMode ? (active ? "Live voice: connected" : "Live voice: idle") : active ? "Browser voice: active" : "Browser voice: idle"}
            </span>
            {active && c.liveMode && state.latency && <span className="muted small" title="From the caller's last word to the first sound of the reply (average over this call)" aria-live="off">Reply {(state.latency.last! / 1000).toFixed(1)} s · avg {(state.latency.average! / 1000).toFixed(1)} s</span>}
            {active && <span className="timer" aria-label="Call length">{formatClock(state.elapsed)}</span>}
          </div>

          <div className="voice-stage">
            {lk && active && state.token?.token && state.token.url
              ? <Suspense fallback={<VoiceOrb state="connecting" />}><LiveKitSession token={state.token.token} url={state.token.url} handlers={c.roomHandlers} /></Suspense>
              : <VoiceOrb state={orb} />}
          </div>
          {slow && <p className="note" role="status">The receptionist hasn&apos;t joined the room yet. Start the voice agent in a terminal: <code>./run.sh agent</code> (the plain <code>./run.sh</code> starts it for you).</p>}

          <div className="step">
            <div className="step-row"><span className="muted small">Current step</span><strong>{state.stepLabel}</strong></div>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Details collected"><span style={{ width: `${pct}%` }} /></div>
            <span className="muted small">{state.progress.total ? `${state.progress.collected} of ${state.progress.total} details collected` : "Working out whether this is lettings or sales"}</span>
          </div>

          <div className="voice-actions">
            {state.phase === "idle" || state.phase === "error" || state.phase === "ended" ? (
              <button className="btn btn-primary btn-lg" onClick={() => { c.reset(); void c.start(); }}><IconPhone /> {state.phase === "ended" ? "Start again" : "Start"}</button>
            ) : (
              <button className="btn btn-danger btn-lg" onClick={() => void c.end()} disabled={state.phase !== "active"}><IconPhoneOff /> {state.phase === "finishing" ? "Saving…" : "End call"}</button>
            )}
            <button className={`btn btn-secondary${c.micOn ? " btn-on" : ""}`} onClick={() => void c.toggleMic()} disabled={!active} aria-pressed={c.micOn} title={c.micSupported ? "Speak instead of typing" : "Speech recognition isn't supported here; audio is still captured"}><IconMic /> {c.micOn ? (c.liveMode ? "Mute microphone" : "Microphone on") : (c.liveMode ? "Unmute microphone" : "Use microphone")}</button>
            {c.transport === "browser" && <label className="switch"><input type="checkbox" checked={c.speakReplies} onChange={(e) => c.setSpeakReplies(e.target.checked)} disabled={!speechSynthesisSupported} /><span>Speak replies aloud</span></label>}
          </div>
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
          {c.micError && <p className="form-error" role="alert">{c.micError}</p>}
          {!c.liveMode && c.micOn && !c.micSupported && <p className="note">This browser can't turn speech into text, so type the caller's replies below. Your audio is still captured for the demo recording.</p>}

          <DemoBanner>Calls are answered by the AI receptionist and saved for staff review. No transfer, emergency handling or booking is made by the call itself.</DemoBanner>
        </section>

        {state.phase === "ended" && state.finished?.discarded && (
          <section className="card" aria-live="polite">
            <h3>Call not saved</h3>
            <p className="muted">The call ended before the caller gave a name, so there is nothing to follow up and it was not added to the review queue.</p>
          </section>
        )}
        {state.phase === "ended" && state.finished && !state.finished.discarded && (
          <section className="card saved-card" aria-live="polite">
            <div className="saved-icon" aria-hidden="true">✓</div>
            <div>
              <h3>Saved for staff review</h3>
              <p>This call ({formatDuration(state.finished.duration_seconds)}) was saved with its transcript{state.finished.has_recording ? " and recording" : ""}. <StatusBadge status={state.finished.status} /></p>
              {!state.finished.is_complete && <p className="note">The call ended before every detail was collected, so staff will see a partial record.</p>}
              <p className="saved-links"><Link className="btn btn-secondary" to={`/history?call=${state.finished.public_id}`}>View call record</Link><Link className="btn btn-ghost" to="/review">Go to staff review queue</Link></p>
            </div>
          </section>
        )}
      </div>

      <div className="live-side">
        <LiveTranscript turns={state.turns} thinking={state.thinking} heard={c.liveMode ? c.liveHeard : c.micInterim} />
        <CallerProfile call={state.call} />
      </div>
    </div>
  );
}
