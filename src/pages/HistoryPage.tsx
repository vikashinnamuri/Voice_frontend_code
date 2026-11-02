import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listCalls } from "../api/calls";
import { useAsync } from "../hooks/useAsync";
import { useCallDrawer } from "../hooks/useCallDrawer";
import { useDebounce } from "../hooks/useDebounce";
import { CallDetailDrawer } from "../features/call-history/CallDetailDrawer";
import { CallFilters } from "../features/call-history/CallFilters";
import { CallList } from "../features/call-history/CallList";
import type { CallFilters as Filters, CallType } from "../types";

const PAGE_SIZE = 8;

export function HistoryPage() {
  const [params] = useSearchParams();
  const drawer = useCallDrawer();
  const [filters, setFilters] = useState<Filters>({ call_type: (params.get("type") as CallType | null) ?? "", page: 1, page_size: PAGE_SIZE, sort: "started_at", order: "desc" });
  const debouncedSearch = useDebounce(filters.search ?? "", 300);
  const query = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);
  const { data, error, loading, reload } = useAsync(() => listCalls(query), [JSON.stringify(query)]);
  const filtered = Boolean(query.search || query.call_type || query.status || query.date_from || query.date_to || query.has_recording);

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Every call is saved</p><h1>Call history</h1></div>{data && <span className="muted">{data.total} {data.total === 1 ? "call" : "calls"}</span>}</header>
      <CallFilters value={filters} onChange={setFilters} />
      <CallList data={data} loading={loading} error={error} onRetry={reload} onOpen={drawer.open} onPage={(p) => setFilters({ ...filters, page: p })} pageSize={PAGE_SIZE} filtered={filtered} />
      <CallDetailDrawer publicId={drawer.openId} onClose={drawer.close} onChanged={reload} />
    </div>
  );
}
