import { ErrorState, EmptyState, Spinner } from "../../components/States";
import type { CallList as CallListData, CallSummary } from "../../types";
import { CallCard } from "./CallCard";
import { Pagination } from "./Pagination";

export function CallList({ data, loading, error, onRetry, onOpen, onPage, pageSize, filtered, renderActions, emptyTitle = "No calls match", emptyText }: {
  data: CallListData | null; loading: boolean; error: string | null; onRetry: () => void; onOpen: (id: string) => void; onPage: (p: number) => void; pageSize: number; filtered: boolean;
  renderActions?: (call: CallSummary) => React.ReactNode; emptyTitle?: string; emptyText?: string;
}) {
  if (error && !data) return <ErrorState message={error} onRetry={onRetry} />;
  if (!data) return <Spinner label="Loading calls…" />;
  return (
    <div className={loading ? "list-loading" : undefined} aria-busy={loading}>
      {error && <ErrorState message={error} onRetry={onRetry} />}
      {data.items.length === 0 ? (
        <EmptyState title={emptyTitle}>{emptyText ?? (filtered ? "Try a different search or clear the filters." : "Calls will appear here once the assistant has taken some.")}</EmptyState>
      ) : (
        <>
          <ul className="call-list">{data.items.map((c) => <CallCard key={c.public_id} call={c} onOpen={onOpen} actions={renderActions?.(c)} />)}</ul>
          <Pagination page={data.page} totalPages={data.total_pages} total={data.total} pageSize={pageSize} onPage={onPage} />
        </>
      )}
    </div>
  );
}
