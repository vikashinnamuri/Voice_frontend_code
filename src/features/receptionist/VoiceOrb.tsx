export type OrbState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "ended";

const CAPTION: Record<OrbState, string> = { idle: "Ready", connecting: "Connecting…", listening: "Listening", thinking: "Thinking…", speaking: "Speaking", ended: "Call ended" };

/** Subtle animated indicator. Motion is switched off for people who prefer reduced motion (see CSS). */
export function VoiceOrb({ state }: { state: OrbState }) {
  return (
    <div className={`orb orb-${state}`} role="status" aria-live="polite" aria-label={`Assistant is ${CAPTION[state].toLowerCase()}`}>
      <span className="orb-ring orb-ring-1" /><span className="orb-ring orb-ring-2" />
      <span className="orb-core"><span className="orb-bars" aria-hidden="true"><i /><i /><i /><i /><i /></span></span>
      <span className="orb-caption">{CAPTION[state]}</span>
    </div>
  );
}
