export function Pagination({ page, totalPages, total, pageSize, onPage }: { page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1, to = Math.min(total, page * pageSize);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted small" aria-live="polite">Showing {from}–{to} of {total}</span>
      <div>
        <button className="btn btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="small">Page {page} of {totalPages}</span>
        <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </nav>
  );
}
