import {useLayoutEffect, useRef} from 'react';

/* latest value for stable callbacks; updated after render, so read it in effects/handlers, not during render */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
