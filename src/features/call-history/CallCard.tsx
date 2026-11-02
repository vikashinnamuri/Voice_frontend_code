import { StatusBadge, TypeBadge } from "../../components/Badges";
import { IconAudio, IconDoc } from "../../components/Icons";
import type { CallSummary } from "../../types";
import { formatDayLabel, formatDuration, formatTimeUK, initials } from "../../utils/format";

export function CallCard({ call, onOpen, actions }: { call: CallSummary; onOpen: (id: string) => void; actions?: React.ReactNode }) {
  return (
    <li className="call-card">
      <button className="call-main" onClick={() => onOpen(call.public_id)} aria-label={`Open call from ${call.caller_name ?? "unknown caller"}`}>
        <span className="avatar" aria-hidden="true">{initials(call.caller_name)}</span>
        <span className="call-text">
          <span className="call-title"><strong>{call.caller_name ?? "Unknown caller"}</strong><TypeBadge type={call.call_type} /></span>
          <span className="call-sub">{call.description}</span>
          <span className="call-meta">{formatDayLabel(call.started_at)}, {formatTimeUK(call.started_at)} · {formatDuration(call.duration_seconds)}
            <span className={`chip${call.has_recording ? " chip-on" : ""}`} title={call.has_recording ? "Recording available" : "No recording"}><IconAudio width={14} height={14} />{call.has_recording ? "Audio" : "No audio"}</span>
            <span className={`chip${call.has_transcript ? " chip-on" : ""}`} title={call.has_transcript ? "Transcript available" : "No transcript"}><IconDoc width={14} height={14} />{call.has_transcript ? "Transcript" : "No transcript"}</span>
          </span>
        </span>
        <span className="call-status"><StatusBadge status={call.status} /></span>
      </button>
      {actions && <div className="call-actions">{actions}</div>}
    </li>
  );
}
