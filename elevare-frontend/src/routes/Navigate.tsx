import {useEffect} from 'react';
import {useRouter} from '@/hooks/useRouter';

/* replaces the history entry by default, so Back skips it */
export function Navigate({to, replace = true}: {to: string; replace?: boolean}) {
  const {navigate} = useRouter();
  useEffect(() => {
    navigate(to, {replace});
  }, [navigate, to, replace]);
  return null;
}
