import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client";

export interface AsyncState<T> { data: T | null; error: string | null; loading: boolean; reload: () => void }

/** Run an async loader whenever `deps` change. Stale responses are ignored; `reload` re-runs it (keeping old data visible). */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const mine = ++latest.current;
    setLoading(true);
    loader()
      .then((result) => { if (mine === latest.current) { setData(result); setError(null); } })
      .catch((e) => { if (mine === latest.current) setError(errorMessage(e)); })
      .finally(() => { if (mine === latest.current) setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
