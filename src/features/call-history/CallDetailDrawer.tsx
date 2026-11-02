import { useEffect, useState } from "react";
import { getCall } from "../../api/calls";
import { errorMessage } from "../../api/client";
import { AudioPlayer } from "../../components/AudioPlayer";
import { TypeBadge, StatusBadge } from "../../components/Badges";
import { Drawer } from "../../components/Drawer";
import { ErrorState, Skeleton } from "../../components/States";
import type { CallDetail } from "../../types";
import { formatBool, formatDateTimeUK, formatDuration, formatGBP, formatMoveIn } from "../../utils/format";
import { ReviewPanel } from "./ReviewPanel";
import { Timeline } from "./Timeline";
import { TranscriptView } from "./TranscriptView";

type Row = [label: string, value: string | null];

export function detailRows(c: CallDetail): Row[] {
  const common: Row[] = [["Name", c.caller_name], ["Email", c.caller_email], ["Phone", c.caller_phone]];
  if (c.call_type === "LETTINGS_ENQUIRY") return [...common, ["Property of interest", c.property_interest], ["Intended move-in date", formatMoveIn(c.move_in_date)], ["Number of residents", c.resident_count?.toString() ?? null], ["Enquiry is for the caller", formatBool(c.enquiry_for_self)], ["Employment status", c.employment_status], ["Annual income", c.annual_income_gbp != null ? formatGBP(c.annual_income_gbp) : null], ["Needs a UK guarantor", formatBool(c.needs_uk_guarantor)], ["Viewing availability", c.viewing_availability]];
  if (c.call_type === "MAINTENANCE_REQUEST") return [...common, ["Current address", c.current_address], ["Property reference / name", c.property_interest], ["Issue", c.maintenance_issue]];
  if (c.call_type === "SALES_LEAD") return [...common, ["Current address", c.current_address], ["Property of interest", c.property_interest], ["Budget", c.budget_gbp != null ? formatGBP(c.budget_gbp) : null], ["Requirement", c.requirement_notes]];
  return common;
}

export function CallDetailDrawer({ publicId, onClose, onChanged }: { publicId: string | null; onClose: () => void; onChanged?: () => void }) {
  const [call, setCall] = useState<CallDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!publicId) return;
    let alive = true;
    setCall(null); setError(null);
    getCall(publicId).then((c) => alive && setCall(c)).catch((e) => alive && setError(errorMessage(e)));
    return () => { alive = false; };
  }, [publicId, attempt]);

  return (
    <Drawer open={Boolean(publicId)} title="Call details" onClose={onClose}>
      {error && <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {!call && !error && <div className="drawer-body"><Skeleton lines={6} /></div>}
      {call && (
        <div className="drawer-body">
          <header className="drawer-head">
            <p className="muted small">{call.public_id} · {formatDateTimeUK(call.started_at)}</p>
            <h2>{call.caller_name ?? "Unknown caller"}</h2>
            <p className="call-desc">{call.description}</p>
            <div className="badge-row"><TypeBadge type={call.call_type} /><StatusBadge status={call.status} />{!call.is_complete && call.status !== "IN_PROGRESS" && <span className="badge badge-amber">Partial: some details missing</span>}</div>
            <dl className="facts"><div><dt>Duration</dt><dd>{formatDuration(call.duration_seconds)}</dd></div><div><dt>Voice</dt><dd>{call.is_simulated ? "Simulated" : "Live voice"}</dd></div><div><dt>Turns</dt><dd>{call.turn_count}</dd></div></dl>
          </header>

          <section className="panel"><h3>Audio recording</h3>
            {call.recordings.length ? call.recordings.map((r) => <AudioPlayer key={r.id} recording={r} />) : <p className="muted">No recording is stored for this call. Recordings appear here when the call's audio was captured.</p>}
          </section>

          <section className="panel"><h3>Captured details</h3>
            <dl className="details">{detailRows(call).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || <span className="muted">Not captured</span>}</dd></div>)}</dl>
          </section>

          <section className="panel"><h3>Transcript</h3><TranscriptView turns={call.transcript.map((t) => ({ ...t }))} /></section>
          <section className="panel"><h3>Timeline</h3><Timeline events={call.events} /></section>
          <section className="panel"><h3>Staff review</h3><ReviewPanel key={call.reviews[0]?.id ?? "none"} call={call} onChanged={(u) => { setCall(u); onChanged?.(); }} /></section>
        </div>
      )}
    </Drawer>
  );
}
