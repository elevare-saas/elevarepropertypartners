import {useCallback, useEffect, useState, type SetStateAction} from 'react';
import {isAbort} from '@/lib/http';
import {useLatest} from './useLatest';

export interface QueryResult<T> {
  data: T | undefined;
  error: Error | null;
  /* true while loading or reloading */
  loading: boolean;
  reload: () => void;
  /* update data locally (e.g. after a save) without refetching */
  setData: (update: SetStateAction<T | undefined>) => void;
}

interface Settled<T> {
  tag: string;
  data: T | undefined;
  error: Error | null;
}

/* a newer load cancels the older one; `key` names what's loaded, so the fetcher can be inline */
export function useQuery<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>): QueryResult<T> {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({tag: '', data: undefined, error: null});
  const latestFetcher = useLatest(fetcher);
  const tag = `${key}#${version}`;

  useEffect(() => {
    const controller = new AbortController();
    latestFetcher.current(controller.signal).then(
      data => setSettled({tag, data, error: null}),
      (error: unknown) => {
        if (isAbort(error) || controller.signal.aborted) return;
        setSettled(s => ({tag, data: s.data, error: error instanceof Error ? error : new Error(String(error))}));
      }
    );
    return () => controller.abort();
  }, [tag, latestFetcher]);

  const reload = useCallback(() => setVersion(v => v + 1), []);
  const setData = useCallback(
    (update: SetStateAction<T | undefined>) =>
      setSettled(s => ({
        ...s,
        data: typeof update === 'function' ? (update as (prev: T | undefined) => T | undefined)(s.data) : update
      })),
    []
  );

  return {data: settled.data, error: settled.error, loading: settled.tag !== tag, reload, setData};
}
