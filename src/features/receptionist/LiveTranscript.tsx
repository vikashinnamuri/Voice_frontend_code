import { useEffect, useRef } from "react";
import { TranscriptView, type TranscriptLine } from "../call-history/TranscriptView";

/** Fixed-height transcript that scrolls inside itself. It follows the conversation unless the reader has scrolled up, and never moves the page. */
export function LiveTranscript({ turns, thinking, heard }: { turns: TranscriptLine[]; thinking: boolean; heard: string }) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [turns.length, thinking, heard]);
  const lines: TranscriptLine[] = heard ? [...turns, { id: "heard-now", speaker: "caller", message: `${heard}…`, timestamp: new Date().toISOString(), pending: true }] : turns;
  return (
    <section className="card transcript-card" aria-label="Live transcript">
      <div className="card-head"><h3>Live transcript</h3><span className="muted small">{turns.length} {turns.length === 1 ? "message" : "messages"}</span></div>
      <div className="transcript-scroll" ref={box} tabIndex={0} aria-live="polite" aria-label="Transcript, scrollable"
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        <TranscriptView turns={lines} emptyText="The conversation will appear here as soon as the call starts." showTime={false} />
        {thinking && <p className="typing" aria-label="Assistant is replying"><span /><span /><span /></p>}
      </div>
    </section>
  );
}
