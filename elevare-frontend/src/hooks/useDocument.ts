import {useEffect, useLayoutEffect} from 'react';
import {useLatest} from './useLatest';

/* restores the previous title on unmount */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export function useNoIndex() {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name=robots]');
    const created = !meta;
    meta ??= Object.assign(document.createElement('meta'), {name: 'robots'});
    const previous = meta.content;
    meta.content = 'noindex, nofollow';
    if (created) document.head.appendChild(meta);
    return () => {
      if (created) meta.remove();
      else meta.content = previous;
    };
  }, []);
}

/* before paint; removed on unmount */
export function useBodyClass(className: string) {
  useLayoutEffect(() => {
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className]);
}

export function useLockBodyScroll(locked = true) {
  useLayoutEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

/* the handler may change between renders */
export function useEscapeKey(handler: () => void) {
  const latest = useLatest(handler);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') latest.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [latest]);
}
