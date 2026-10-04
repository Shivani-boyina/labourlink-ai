import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../services/api';

export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    run()
      .then((d) => { if (live) setData(d); })
      .catch((e: unknown) => { if (live) setError(errorMessage(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [run, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}
