import type {ButtonHTMLAttributes, ReactNode} from 'react';
import mark from '../assets/elevare-mark.png';
import {line} from '../concierge/engine';
import {cur} from '../concierge/store';
import type {Listing} from '../concierge/data';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const eyebrow = 'text-[11px] tracking-[.2em] uppercase text-muted font-semibold';
export const hint = 'text-[12px] text-faint';
export const num = 'font-mono tabular-nums';
export const fieldLabel = 'text-[12px] text-muted';

export const Eyebrow = ({children, className}: {children: ReactNode; className?: string}) =>
  <div className={cx(eyebrow, className)}>{children}</div>;

/* concierge bubble */
export function Say({step}: {step: string}) {
  const t = line(step);
  return (
    <div className="grid grid-cols-[34px_1fr] gap-[10px] items-start mb-[18px]">
      <span className="w-[34px] h-[34px] rounded-full bg-surface-2 border border-line grid place-items-center overflow-hidden">
        <img src={mark} alt="" className="w-[26px]" />
      </span>
      <p
        className="m-0 bg-surface border border-line rounded-[4px_14px_14px_14px] py-[10px] px-[14px] text-[14px] text-ink [&_em]:not-italic [&_em]:text-pink"
        dangerouslySetInnerHTML={{__html: t.charAt(0).toUpperCase() + t.slice(1)}}
      />
    </div>
  );
}

export function Question({title, sub}: {title: ReactNode; sub?: ReactNode}) {
  return <>
    <h2 className="text-[clamp(30px,6vw,46px)] mb-[6px]">{title}</h2>
    {sub !== undefined && <p className="text-muted m-0 mb-[22px] max-w-[56ch]">{sub}</p>}
  </>;
}

export const Screen = ({children, className}: {children: ReactNode; className?: string}) =>
  <section className={cx('animate-rise', className)}>{children}</section>;

export const Opts = ({children, className}: {children: ReactNode; className?: string}) =>
  <div className={cx('grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-[10px]', className)}>{children}</div>;

/* option card */
interface OptProps { pressed?: boolean; title: ReactNode; desc: ReactNode; count?: number; wide?: boolean; onClick: () => void }
export function Opt({pressed, title, desc, count, wide, onClick}: OptProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cx(
        'relative text-left border border-line bg-surface rounded-[14px] py-[14px] px-[16px] cursor-pointer grid gap-[3px]',
        '[transition:border-color_.15s,transform_.15s,background_.15s] hover:border-violet hover:[transform:translateY(-1px)]',
        "aria-pressed:grad-border! aria-pressed:after:content-['✓'] aria-pressed:after:absolute aria-pressed:after:top-[12px] aria-pressed:after:right-[14px] aria-pressed:after:font-bold aria-pressed:after:text-pink",
        wide && 'col-[1/-1]'
      )}
    >
      <b className="text-[15px]">{title}</b>
      <span className="text-[12.5px] text-muted">{desc}</span>
      {count !== undefined && <MatchCount n={count} />}
    </button>
  );
}
export const MatchCount = ({n}: {n: number}) =>
  <em className="not-italic text-[11.5px] font-semibold text-pink mt-[4px]">{n === 0 ? 'no matches' : n + (n === 1 ? ' match' : ' matches')}</em>;

export const Chips = ({children, className}: {children: ReactNode; className?: string}) =>
  <div className={cx('flex flex-wrap gap-[8px]', className)}>{children}</div>;

export const chipClass = 'border border-line bg-surface rounded-full py-[8px] px-[14px] text-[13.5px] cursor-pointer hover:border-violet aria-pressed:bg-grad! aria-pressed:border-transparent! aria-pressed:text-white aria-pressed:font-semibold';
export function Chip({pressed, onClick, children, add}: {pressed?: boolean; onClick: () => void; children: ReactNode; add?: boolean}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick}
      className={cx(chipClass, add && "before:content-['+_'] before:text-pink before:font-bold")}>
      {children}
    </button>
  );
}
export const Cnt = ({children}: {children: ReactNode}) =>
  <small className="text-[11px] opacity-70 ml-[3px] font-mono">{children}</small>;

/* pill toggles on the match screen (save, compare) */
export const heartClass = 'border border-line bg-surface-2 rounded-full py-[7px] px-[13px] text-[13px] cursor-pointer hover:border-violet aria-pressed:bg-grad! aria-pressed:border-transparent! aria-pressed:text-white aria-pressed:font-semibold';

export const Pair = ({children, className}: {children: ReactNode; className?: string}) =>
  <div className={cx('grid grid-cols-[1fr_1fr] gap-[12px] upto480:grid-cols-[1fr]', className)}>{children}</div>;

export const Box = ({children, className}: {children: ReactNode; className?: string}) =>
  <div className={cx('bg-surface border border-line rounded-[14px] py-[14px] px-[16px] grid gap-[8px]', className)}>{children}</div>;

/* primary call to action */
const ctaBase = 'rounded-full font-bold cursor-pointer no-underline inline-flex items-center gap-[8px] hover:brightness-[1.08] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none';
const ctaSizes = {
  md: 'py-[14px] px-[26px] text-[15px]',
  sm: 'py-[9px] px-[18px] text-[13px]',
  dock: 'py-[11px] px-[18px] text-[14px]'
};
interface CtaProps extends ButtonHTMLAttributes<HTMLButtonElement> { size?: keyof typeof ctaSizes; secondary?: boolean }
export function Cta({size = 'md', secondary, className, ...rest}: CtaProps) {
  return (
    <button type="button" {...rest}
      className={cx(ctaBase, ctaSizes[size],
        secondary ? 'bg-surface-2 border border-line text-white' : 'border-0 bg-grad text-white shadow-[0_8px_30px_rgba(192,79,208,.35)]',
        className)} />
  );
}

export const ghostClass = 'border-0 bg-transparent text-muted cursor-pointer text-[13px] py-[6px] px-0 underline underline-offset-[3px]';
export const Ghost = ({className, ...rest}: ButtonHTMLAttributes<HTMLButtonElement>) =>
  <button type="button" {...rest} className={cx(ghostClass, className)} />;

export const Actions = ({children}: {children: ReactNode}) =>
  <div className="flex gap-[10px] items-center justify-between mt-[24px] flex-wrap">{children}</div>;

export const Skip = ({onClick, label}: {onClick: () => void; label?: string}) =>
  <Ghost onClick={onClick}>{label || 'Skip, I’m flexible'}</Ghost>;

/* "Continue →" row; property/timing/budget/must screens also offer a skip */
export function Next({label, onNext, onSkip}: {label?: string; onNext: () => void; onSkip: () => void}) {
  return (
    <Actions>
      {['property', 'timing', 'budget', 'must'].includes(cur) ? <Skip onClick={onSkip} /> : <span />}
      <Cta onClick={onNext}>{label || 'Continue'} →</Cta>
    </Actions>
  );
}

/* illustrated property thumbnail (stands in for listing photos) */
export function Art({p, k = ''}: {p: Listing; k?: string}) {
  const h = p.hue, g = `g${p.id}${k}`, sea = p.am.includes('seaview'), condo = p.type === 'condo';
  return (
    <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Illustration of ${p.name}`} className="block w-full h-full">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`hsl(${260 + h / 6} 45% 22%)`} />
          <stop offset=".6" stopColor={`hsl(${320 + h / 10} 55% 55%)`} />
          <stop offset="1" stopColor="hsl(30 80% 70%)" />
        </linearGradient>
      </defs>
      <rect width="320" height="160" fill={`url(#${g})`} />
      <circle cx="240" cy="70" r="18" fill="hsl(38 95% 75%)" opacity=".9" />
      {sea
        ? <><rect y="80" width="320" height="28" fill={`hsl(${200 + h / 12} 45% 32%)`} /><rect y="80" width="320" height="2" fill="#fff" opacity=".3" /></>
        : <path d="M0 94 Q60 62 130 86 T320 78 V110 H0Z" fill="hsl(270 30% 20%)" opacity=".75" />}
      <rect y="104" width="320" height="56" fill="hsl(270 18% 14%)" />
      {condo
        ? <><rect x="80" y="30" width="90" height="76" fill="hsl(30 25% 88%)" />{[40, 56, 72, 88].map(y => <rect key={y} x="90" y={y} width="70" height="9" fill="hsl(40 90% 68%)" opacity=".75" />)}</>
        : <><rect x="70" y="60" width="130" height="44" fill="hsl(30 25% 88%)" /><path d="M60 62 L135 38 L210 62Z" fill={`hsl(${h} 25% 22%)`} /><rect x="90" y="72" width="24" height="32" fill="hsl(40 90% 65%)" opacity=".85" /><rect x="124" y="72" width="54" height="18" fill="hsl(40 90% 70%)" opacity=".7" /></>}
      {(p.am.includes('pool') || condo) && <><rect x="40" y="114" width="200" height="26" rx="3" fill={`hsl(${190 + h / 20} 80% 55%)`} /><rect x="40" y="114" width="200" height="3" fill="#fff" opacity=".4" /></>}
      <path d="M268 150 C266 120 270 96 262 72" stroke="hsl(270 20% 10%)" strokeWidth="4" fill="none" />
      <g fill="hsl(270 20% 10%)"><path d="M262 72 q-26 -6 -40 10 q22 -4 40 -10Z" /><path d="M262 72 q24 -12 40 2 q-22 -2 -40 -2Z" /><path d="M262 72 q-8 -22 -30 -26 q16 10 30 26Z" /><path d="M262 72 q10 -22 32 -22 q-18 8 -32 22Z" /></g>
    </svg>
  );
}

