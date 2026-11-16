import {useEffect} from 'react';
import type {Toast} from '@/context/toast/ToastContext';
import {cx} from '@/lib/format';

const AUTO_CLOSE_MS = 5000;

export function Toaster({toasts, onDismiss}: {toasts: Toast[]; onDismiss: (id: number) => void}) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="fixed z-[60] bottom-[20px] right-[20px] upto600:left-[12px] upto600:right-[12px] upto600:bottom-[12px] grid gap-[10px] w-[min(420px,calc(100vw-24px))] upto600:w-auto pointer-events-none"
    >
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({toast, onDismiss}: {toast: Toast; onDismiss: (id: number) => void}) {
  useEffect(() => {
    if (toast.persist) return;
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [toast.id, toast.persist, onDismiss]);

  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      className={cx(
        'pointer-events-auto animate-rise flex items-start gap-[10px] rounded-[12px] py-[12px] px-[14px] text-[13.5px] border shadow-[0_12px_40px_rgba(0,0,0,.45)]',
        toast.kind === 'error' && 'border-[#6b2a3a] bg-[#1f0c13] text-[#ffb3c4]',
        toast.kind === 'ok' && 'border-[#1f5a3a] bg-[#0b1d14] text-good',
        toast.kind === 'info' && 'border-line bg-surface-2 text-ink'
      )}
    >
      <span className="flex-1 min-w-0 break-words select-text">{toast.text}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="border-0 bg-transparent text-inherit opacity-70 hover:opacity-100 cursor-pointer text-[14px] leading-none p-[2px]"
      >
        ✕
      </button>
    </div>
  );
}
