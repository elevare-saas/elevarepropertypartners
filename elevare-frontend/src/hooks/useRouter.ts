import {use, useCallback} from 'react';
import {RouterContext, type NavigateOptions} from '@/context/router/RouterContext';

export function useRouter() {
  const router = use(RouterContext);
  if (!router) throw new Error('useRouter must be used inside <RouterProvider>.');
  return router;
}

/* one query param as [value, setValue]; null removes it */
export function useSearchParam(name: string) {
  const {location, navigate} = useRouter();
  const value = new URLSearchParams(location.search).get(name);
  const setValue = useCallback(
    (next: string | null, options: NavigateOptions = {replace: true}) => {
      const params = new URLSearchParams(location.search);
      if (next === null) params.delete(name);
      else params.set(name, next);
      const query = params.toString();
      navigate(location.pathname + (query ? '?' + query : ''), options);
    },
    [location.pathname, location.search, name, navigate]
  );
  return [value, setValue] as const;
}
