import {useCallback, useMemo, useRef, useState, type ReactNode} from 'react';
import {Toaster} from '@/components/admin/Toaster';
import {ToastContext, type Toast, type ToastOptions, type ToastValue} from './ToastContext';

const MAX_VISIBLE = 4;

export function ToastProvider({children}: {children: ReactNode}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts(ts => ts.filter(t => t.id !== id)), []);

  const show = useCallback((text: string, {kind = 'info', persist = false}: ToastOptions = {}) => {
    const id = nextId.current++;
    setToasts(ts => [...ts, {id, text, kind, persist}].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const value = useMemo<ToastValue>(
    () => ({
      show,
      success: (text, options) => show(text, {...options, kind: 'ok'}),
      error: (text, options) => show(text, {...options, kind: 'error'}),
      dismiss
    }),
    [show, dismiss]
  );

  return (
    <ToastContext value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext>
  );
}
