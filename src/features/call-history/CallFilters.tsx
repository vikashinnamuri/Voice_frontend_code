import { IconSearch } from "../../components/Icons";
import type { CallFilters as Filters } from "../../types";
import { CALL_TYPE_LABEL, STATUS_LABEL } from "../../utils/labels";

export function CallFilters({ value, onChange, hideStatus = false }: { value: Filters; onChange: (next: Filters) => void; hideStatus?: boolean }) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch, page: 1 });
  const active = Boolean(value.search || value.call_type || (!hideStatus && value.status) || value.date_from || value.date_to || value.has_recording);

  return (
    <form className="filters" role="search" onSubmit={(e) => e.preventDefault()} aria-label="Filter calls">
      <label className="field field-search"><span className="sr-only">Search calls</span>
        <IconSearch width={18} height={18} />
        <input type="search" placeholder="Search name, email, phone, property or call type" value={value.search ?? ""} maxLength={100} onChange={(e) => set({ search: e.target.value })} />
      </label>
      <label className="field"><span>Call type</span>
        <select value={value.call_type ?? ""} onChange={(e) => set({ call_type: e.target.value as Filters["call_type"] })}>
          <option value="">All types</option>{Object.entries(CALL_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>
      {!hideStatus && <label className="field"><span>Status</span>
        <select value={value.status ?? ""} onChange={(e) => set({ status: e.target.value as Filters["status"] })}>
          <option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></label>}
      <label className="field"><span>From</span><input type="date" value={value.date_from ?? ""} max={value.date_to || undefined} onChange={(e) => set({ date_from: e.target.value })} /></label>
      <label className="field"><span>To</span><input type="date" value={value.date_to ?? ""} min={value.date_from || undefined} onChange={(e) => set({ date_to: e.target.value })} /></label>
      <label className="field"><span>Recording</span>
        <select value={value.has_recording ?? ""} onChange={(e) => set({ has_recording: e.target.value as Filters["has_recording"] })}>
          <option value="">Any</option><option value="true">Has recording</option><option value="false">No recording</option>
        </select></label>
      <label className="field"><span>Sort by</span>
        <select value={`${value.sort ?? "started_at"}:${value.order ?? "desc"}`} onChange={(e) => { const [sort, order] = e.target.value.split(":"); onChange({ ...value, sort: sort as Filters["sort"], order: order as Filters["order"], page: 1 }); }}>
          <option value="started_at:desc">Newest first</option><option value="started_at:asc">Oldest first</option>
          <option value="duration_seconds:desc">Longest calls</option><option value="caller_name:asc">Caller name A–Z</option>
        </select></label>
      {active && <button type="button" className="btn btn-ghost" onClick={() => onChange({ sort: value.sort, order: value.order, status: hideStatus ? value.status : "", page: 1, page_size: value.page_size })}>Clear filters</button>}
    </form>
  );
}
