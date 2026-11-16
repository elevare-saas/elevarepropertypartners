/* separate from pages/home/components/ui.tsx so the admin bundle skips the concierge engine */
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';
import mark from '@/assets/elevare-mark.png';
import {useEscapeKey, useLockBodyScroll} from '@/hooks/useDocument';
import {cx} from '@/lib/format';

export const Brand = ({sub = 'ADMIN'}: {sub?: string}) => (
  <span className="flex items-center gap-[12px]">
    <img src={mark} alt="" className="w-[40px] h-auto block" />
    <span>
      <b className="block font-wordmark font-medium text-[18px] tracking-[.14em] leading-none">ELEVARE</b>
      <small className="block text-[8.5px] tracking-[.3em] text-muted mt-[5px]">{sub}</small>
    </span>
  </span>
);

const btnBase =
  'rounded-full font-semibold cursor-pointer inline-flex items-center justify-center gap-[8px] whitespace-nowrap hover:brightness-[1.1] disabled:opacity-40 disabled:cursor-not-allowed';
const btnKind = {
  primary: 'border-0 bg-grad text-white shadow-[0_8px_30px_rgba(192,79,208,.3)]',
  secondary: 'bg-surface-2 border border-line text-ink hover:border-violet',
  danger: 'bg-transparent border border-[#6b2a3a] text-[#ff8fa8] hover:bg-[#2a1018]',
  quiet: 'bg-transparent border border-transparent text-muted hover:text-ink hover:border-line'
};
const btnSize = {md: 'py-[11px] px-[22px] text-[14px]', sm: 'py-[7px] px-[14px] text-[12.5px]'};
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: keyof typeof btnKind;
  size?: keyof typeof btnSize;
}
export const Btn = ({kind = 'secondary', size = 'md', className, type = 'button', ...rest}: BtnProps) => (
  <button type={type} {...rest} className={cx(btnBase, btnKind[kind], btnSize[size], className)} />
);

const fieldClass =
  'w-full border border-line rounded-[10px] py-[10px] px-[12px] bg-surface-2 text-ink text-[14px] placeholder:text-faint focus:border-violet focus:outline-none disabled:opacity-60';

export function Field({
  label,
  hint,
  children,
  className
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('grid gap-[6px] content-start', className)}>
      <span className="text-[12px] text-muted font-semibold tracking-[.02em]">{label}</span>
      {children}
      {hint && <span className="text-[11.5px] text-faint">{hint}</span>}
    </label>
  );
}
export const Input = ({className, ...p}: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cx(fieldClass, className)} />
);
export const Select = ({className, ...p}: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(fieldClass, 'cursor-pointer', className)} />
);
export const Textarea = ({className, ...p}: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(fieldClass, 'resize-y min-h-[80px]', className)} />
);

export const Card = ({children, className}: {children: ReactNode; className?: string}) => (
  <div className={cx('bg-surface border border-line rounded-[16px]', className)}>{children}</div>
);

export const Alert = ({kind = 'error', children}: {kind?: 'error' | 'ok' | 'info'; children: ReactNode}) => (
  <div
    role={kind === 'error' ? 'alert' : 'status'}
    className={cx(
      'rounded-[10px] py-[10px] px-[14px] text-[13.5px] border',
      kind === 'error' && 'border-[#6b2a3a] bg-[#1f0c13] text-[#ffb3c4]',
      kind === 'ok' && 'border-[#1f5a3a] bg-[#0b1d14] text-good',
      kind === 'info' && 'border-line bg-surface-2 text-muted'
    )}
  >
    {children}
  </div>
);

export const Badge = ({
  tone = 'muted',
  children
}: {
  tone?: 'good' | 'muted' | 'violet' | 'pink';
  children: ReactNode;
}) => (
  <span
    className={cx(
      'inline-flex items-center rounded-full py-[2px] px-[9px] text-[11px] font-semibold border whitespace-nowrap',
      tone === 'good' && 'border-[#1f5a3a] text-good bg-[#0b1d14]',
      tone === 'muted' && 'border-line text-muted bg-surface-2',
      tone === 'violet' && 'border-[#3d2a66] text-lilac bg-[#1a1230]',
      tone === 'pink' && 'border-[#5a2448] text-pink bg-[#1f0c19]'
    )}
  >
    {children}
  </span>
);

/* side sheet: full screen on phones; Escape or the backdrop closes it */
export function Sheet({
  title,
  onClose,
  children,
  footer
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEscapeKey(onClose);
  useLockBodyScroll();
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[rgba(0,0,0,.6)] backdrop-blur-[2px]" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className="relative w-full max-w-[640px] h-full bg-bg border-l border-line flex flex-col animate-rise"
      >
        <header className="flex items-center justify-between gap-[12px] py-[16px] px-[22px] border-b border-line">
          <h2 className="text-[26px]">{title}</h2>
          <Btn kind="quiet" size="sm" onClick={onClose} aria-label="Close">
            ✕
          </Btn>
        </header>
        <div className="flex-1 overflow-y-auto py-[20px] px-[22px]">{children}</div>
        {footer && (
          <footer className="py-[14px] px-[22px] border-t border-line flex gap-[10px] justify-end flex-wrap">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
}
