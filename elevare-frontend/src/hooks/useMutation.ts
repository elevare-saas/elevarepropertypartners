import {useCallback, useState} from 'react';
import {errorMessage} from '@/lib/http';
import {useLatest} from './useLatest';

export type MutationResult<R> = {ok: true; data: R} | {ok: false; error: string};

export interface Mutation<A extends unknown[], R> {
  /* never throws: check `result.ok` */
  run: (...args: A) => Promise<MutationResult<R>>;
  pending: boolean;
  /* last failure's message ('' if none) */
  error: string;
  reset: () => void;
}

export function useMutation<A extends unknown[], R>(action: (...args: A) => Promise<R>): Mutation<A, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const latestAction = useLatest(action);

  const run = useCallback(
    async (...args: A): Promise<MutationResult<R>> => {
      setPending(true);
      setError('');
      try {
        return {ok: true, data: await latestAction.current(...args)};
      } catch (e) {
        const message = errorMessage(e);
        setError(message);
        return {ok: false, error: message};
      } finally {
        setPending(false);
      }
    },
    [latestAction]
  );

  const reset = useCallback(() => setError(''), []);
  return {run, pending, error, reset};
}
