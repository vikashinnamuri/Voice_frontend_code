import type { Speaker } from "../../types";
import { formatTimeUK } from "../../utils/format";

export interface TranscriptLine { id: string | number; speaker: Speaker; message: string; timestamp: string; confidence?: number | null; pending?: boolean }

export function TranscriptView({ turns, emptyText = "No transcript was saved for this call.", showTime = true }: { turns: TranscriptLine[]; emptyText?: string; showTime?: boolean }) {
  if (!turns.length) return <p className="muted">{emptyText}</p>;
  return (
    <ol className="transcript" aria-label="Call transcript">
      {turns.map((t) => (
        <li key={t.id} className={`turn turn-${t.speaker}${t.pending ? " turn-pending" : ""}`}>
          <span className="turn-who">{t.speaker === "assistant" ? "Assistant" : "Caller"}</span>
          <p>{t.message}</p>
          {showTime && !t.pending && <span className="turn-meta">{formatTimeUK(t.timestamp)}{t.confidence != null && <> · {Math.round(t.confidence * 100)}% confidence</>}</span>}
        </li>
      ))}
    </ol>
  );
}
