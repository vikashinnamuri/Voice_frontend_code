import { useMemo, useState } from "react";
import { listCalls, updateReview } from "../api/calls";
import { getSummary } from "../api/dashboard";
import { errorMessage } from "../api/client";
import { DemoBanner } from "../components/DemoBanner";
import { useAsync } from "../hooks/useAsync";
import { useCallDrawer } from "../hooks/useCallDrawer";
import { useDebounce } from "../hooks/useDebounce";
import { CallDetailDrawer } from "../features/call-history/CallDetailDrawer";
import { CallFilters } from "../features/call-history/CallFilters";
import { CallList } from "../features/call-history/CallList";
import type { CallFilters as Filters, CallStatus, CallSummary, ReviewStatus } from "../types";
import { REVIEW_ACTIONS, STATUS_LABEL } from "../utils/labels";

const PAGE_SIZE = 8;
const TABS: CallStatus[] = ["NEEDS_STAFF_REVIEW", "CONTACT_CALLER", "VIEWING_TO_ARRANGE", "REVIEWED", "CLOSED"];

export function ReviewQueuePage() {
  const drawer = useCallDrawer();
  const [filters, setFilters] = useState<Filters>({ status: "NEEDS_STAFF_REVIEW", page: 1, page_size: PAGE_SIZE, sort: "started_at", order: "asc" });
  const debounced = useDebounce(filters.search ?? "", 300);
  const query = useMemo(() => ({ ...filters, search: debounced }), [filters, debounced]);
  const list = useAsync(() => listCalls(query), [JSON.stringify(query)]);
  const counts = useAsync(getSummary, []);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => { list.reload(); counts.reload(); };
  async function quick(id: string, status: ReviewStatus) {
    setBusyId(id); setActionError(null);
    try { await updateReview(id, status, "", "Staff member"); refresh(); }
    catch (e) { setActionError(errorMessage(e)); }
    finally { setBusyId(null); }
  }

  const actions = (call: CallSummary) => { const id = call.public_id; return (
    <div className="quick-actions" role="group" aria-label="Staff review actions">
      <span className="muted small">Staff action:</span>
      {REVIEW_ACTIONS.filter((a) => a.status !== filters.status).map((a) => <button key={a.status} className="btn btn-secondary btn-sm" disabled={busyId === id} onClick={() => void quick(id, a.status)} title={a.hint}>{a.label}</button>)}
    </div>
  ); };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Human in the loop</p><h1>Staff review queue</h1></div></header>
      <DemoBanner>Staff review actions only update the record in this system: nothing is sent to the caller.</DemoBanner>

      <div className="tabs" role="tablist" aria-label="Review status">
        {TABS.map((s) => (
          <button key={s} role="tab" aria-selected={filters.status === s} className={`tab${filters.status === s ? " active" : ""}${s === "NEEDS_STAFF_REVIEW" ? " tab-amber" : ""}`} onClick={() => setFilters({ ...filters, status: s, page: 1, order: s === "NEEDS_STAFF_REVIEW" ? "asc" : "desc" })}>
            {STATUS_LABEL[s]}<span className="tab-count">{counts.data?.status_counts[s] ?? 0}</span>
          </button>
        ))}
      </div>
      <CallFilters value={filters} onChange={setFilters} hideStatus />
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      <CallList data={list.data} loading={list.loading} error={list.error} onRetry={refresh} onOpen={drawer.open} onPage={(p) => setFilters({ ...filters, page: p })} pageSize={PAGE_SIZE}
        filtered={Boolean(query.search || query.call_type || query.date_from || query.date_to || query.has_recording)} renderActions={actions}
        emptyTitle={filters.status === "NEEDS_STAFF_REVIEW" ? "Nothing waiting for review" : `No “${STATUS_LABEL[filters.status as CallStatus]}” calls`}
        emptyText={filters.status === "NEEDS_STAFF_REVIEW" ? "New calls from the Live receptionist will appear here." : undefined} />
      <CallDetailDrawer publicId={drawer.openId} onClose={drawer.close} onChanged={refresh} />
    </div>
  );
}
