import type { CallEvent } from "../../types";
import { formatDateTimeUK } from "../../utils/format";
import { EVENT_ICON } from "../../utils/labels";

export function Timeline({ events }: { events: CallEvent[] }) {
  if (!events.length) return <p className="muted">No events recorded.</p>;
  return (
    <ol className="timeline" aria-label="Call timeline">
      {events.map((e) => (
        <li key={e.id}>
          <span className="timeline-dot" aria-hidden="true">{EVENT_ICON[e.event_type] ?? "•"}</span>
          <div><strong>{e.label}</strong><span className="muted small">{formatDateTimeUK(e.timestamp)}</span></div>
        </li>
      ))}
    </ol>
  );
}
