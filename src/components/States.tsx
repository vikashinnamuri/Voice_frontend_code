import type { ReactNode } from "react";

export const Spinner = ({ label = "Loading…" }: { label?: string }) => (
  <div className="state" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" /><span>{label}</span></div>
);

export const EmptyState = ({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) => (
  <div className="state state-empty"><strong>{title}</strong>{children && <p>{children}</p>}{action}</div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="state state-error" role="alert"><strong>Something went wrong</strong><p>{message}</p>{onRetry && <button className="btn btn-secondary" onClick={onRetry}>Try again</button>}</div>
);

export const Skeleton = ({ lines = 3 }: { lines?: number }) => (
  <div className="skeleton-group" aria-hidden="true">{Array.from({ length: lines }, (_, i) => <div key={i} className="skeleton" style={{ width: `${92 - i * 14}%` }} />)}</div>
);
