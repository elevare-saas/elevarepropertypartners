/* minimal History-API router, so the admin area needs no router dependency */
import {useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import {RouterContext, type NavigateOptions, type RouterLocation, type RouterValue} from './RouterContext';

const readLocation = (): RouterLocation => ({
  pathname: window.location.pathname.replace(/(.)\/+$/, '$1'),
  search: window.location.search
});

export function RouterProvider({children}: {children: ReactNode}) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onPop = () => setLocation(readLocation());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string, {replace = false}: NavigateOptions = {}) => {
    const url = new URL(to, window.location.href);
    if (url.pathname + url.search !== window.location.pathname + window.location.search) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search + url.hash);
      if (!replace) window.scrollTo(0, 0);
    }
    setLocation(readLocation());
  }, []);

  const value = useMemo<RouterValue>(() => ({location, navigate}), [location, navigate]);
  return <RouterContext value={value}>{children}</RouterContext>;
}
