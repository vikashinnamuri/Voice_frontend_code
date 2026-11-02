import { useState } from "react";
import { errorMessage } from "../../api/client";
import { updateReview } from "../../api/calls";
import { StatusBadge } from "../../components/Badges";
import type { CallDetail, ReviewStatus } from "../../types";
import { formatDateTimeUK } from "../../utils/format";
import { REVIEW_ACTIONS, STATUS_LABEL } from "../../utils/labels";

/** Internal staff actions. They only change this demo database: nothing is sent to the caller. */
export function ReviewPanel({ call, onChanged }: { call: CallDetail; onChanged: (updated: CallDetail) => void }) {
  const [status, setStatus] = useState<ReviewStatus>(call.status === "IN_PROGRESS" ? "REVIEWED" : (call.status as ReviewStatus));
  const [note, setNote] = useState("");
  const [by, setBy] = useState("Staff member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (call.status === "IN_PROGRESS") return <p className="muted">This call is still in progress. It can be reviewed once it ends.</p>;

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try { onChanged(await updateReview(call.public_id, status, note, by)); setNote(""); setSaved(true); }
    catch (e) { setError(errorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="review">
      <p className="note">Staff review action: it updates this record only and nothing is sent to the caller.</p>
      <div className="review-current"><span className="muted small">Current status</span><StatusBadge status={call.status} /></div>

      <fieldset className="choice-group">
        <legend>Set status</legend>
        {[{ status: "NEEDS_STAFF_REVIEW" as ReviewStatus, label: STATUS_LABEL.NEEDS_STAFF_REVIEW, hint: "Put it back in the review queue" }, ...REVIEW_ACTIONS].map((a) => (
          <label key={a.status} className={`choice${status === a.status ? " choice-on" : ""}`}>
            <input type="radio" name={`status-${call.public_id}`} checked={status === a.status} onChange={() => setStatus(a.status)} />
            <span><strong>{a.label}</strong><small>{a.hint}</small></span>
          </label>
        ))}
      </fieldset>

      <label className="field"><span>Staff note</span>
        <textarea rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Property is available. Ring after 5pm to agree a viewing." />
        <small className="muted">{note.length}/2000</small>
      </label>
      <label className="field"><span>Reviewed by</span><input value={by} maxLength={120} onChange={(e) => setBy(e.target.value)} /></label>

      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && <p className="form-ok" role="status">Saved.</p>}
      <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save review"}</button>

      {call.reviews.length > 0 && (
        <div className="review-history">
          <h4>Review history</h4>
          <ul>
            {call.reviews.map((r) => (
              <li key={r.id}>
                <div><StatusBadge status={r.status} /><span className="muted small"> {formatDateTimeUK(r.reviewed_at ?? r.created_at)}{r.reviewed_by ? ` · ${r.reviewed_by}` : ""}</span></div>
                {r.staff_note && <p>{r.staff_note}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
