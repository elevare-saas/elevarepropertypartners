import type {ReactNode} from 'react';
import type {Mode} from '../../concierge/data';
import type {Photo} from '../../concierge/photos';
import {cx, eyebrow} from '../ui';

/* the page grid: one content width, generous gutters */
export const wrap = 'max-w-[1200px] mx-auto px-[20px] from760:px-[36px]';

/* a full-bleed band: "dark" is the brand ground, "paper" re-tones every token to warm ivory */
export function Band({id, tone = 'dark', children, className, label}: {id?: string; tone?: 'dark' | 'paper'; children: ReactNode; className?: string; label?: string}) {
  return (
    <section id={id} aria-labelledby={label} className={cx('relative scroll-mt-[64px]', tone === 'paper' ? 'paper' : 'bg-bg', className ?? 'py-[104px] upto600:py-[72px]')}>
      <div data-reveal className={wrap}>{children}</div>
    </section>
  );
}

export function Heading({id, kicker, title, sub, className}: {id?: string; kicker: string; title: ReactNode; sub?: ReactNode; className?: string}) {
  return (
    <div className={className}>
      <div className={eyebrow}>{kicker}</div>
      <h2 id={id} className="text-[clamp(34px,4.8vw,56px)] mt-[12px] max-w-[22ch]">{title}</h2>
      {sub && <p className="text-muted text-[16.5px] mt-[14px] mb-0 max-w-[58ch]">{sub}</p>}
    </div>
  );
}

/* band + heading + content: the standard section */
export function Section({id, kicker, title, sub, children, tone, className}: {id: string; kicker: string; title: ReactNode; sub?: ReactNode; children: ReactNode; tone?: 'dark' | 'paper'; className?: string}) {
  return (
    <Band id={id} tone={tone} label={id + '-h'} className={className}>
      <Heading id={id + '-h'} kicker={kicker} title={title} sub={sub} />
      <div className="mt-[40px]">{children}</div>
    </Band>
  );
}

/* a photo with an optional caption chip; the frame sets the shape */
export function Pic({ph, className, caption = true, eager}: {ph: Photo; className?: string; caption?: boolean; eager?: boolean}) {
  return (
    <figure className={cx(!/\babsolute\b/.test(className ?? '') && 'relative', 'm-0 overflow-hidden rounded-[22px] bg-surface-2', className)}>
      <img src={ph.src} width={ph.w} height={ph.h} alt={ph.caption} loading={eager ? 'eager' : 'lazy'} decoding="async"
        className="absolute inset-0 w-full h-full object-cover" />
      {caption && <figcaption className="absolute left-[12px] bottom-[12px] bg-[rgba(5,4,9,.62)] backdrop-blur-[6px] text-white rounded-full py-[4px] px-[11px] text-[11.5px]">{ph.caption}</figcaption>}
    </figure>
  );
}

/* Rent | Buy segmented switch */
export function ModeSwitch({mode, onChange, label = 'Show'}: {mode: Mode; onChange: (m: Mode) => void; label?: string}) {
  return (
    <div role="group" aria-label={label} className="inline-flex p-[3px] gap-[2px] rounded-full border border-line bg-surface">
      {(['rent', 'buy'] as Mode[]).map(m => (
        <button key={m} type="button" aria-pressed={mode === m} onClick={() => onChange(m)}
          className="border-0 bg-transparent rounded-full py-[7px] px-[16px] text-[13.5px] cursor-pointer text-muted hover:text-ink aria-pressed:bg-ink aria-pressed:text-bg aria-pressed:font-semibold">
          {m === 'rent' ? 'To rent' : 'For sale'}
        </button>
      ))}
    </div>
  );
}

/* horizontal comparison bar: the area average, then this home */
export function PriceBars({market, price, label, fmt}: {market: number; price: number; label: string; fmt: (v: number) => string}) {
  return (
    <div className="grid gap-[8px] text-[12.5px]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[10px] gap-y-[4px]">
        <span className="text-muted">{label}</span><span className="font-mono tabular-nums text-muted">{fmt(market)}</span>
        <span className="col-[1/-1] block h-[8px] rounded-[4px] bg-bar" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[10px] gap-y-[4px]">
        <span className="font-semibold">This home</span><span className="font-mono tabular-nums">{fmt(price)}</span>
        <span className="col-[1/-1] block h-[8px] rounded-[4px] bg-line overflow-hidden">
          <i className="block h-full rounded-[4px] bg-grad" style={{width: `${Math.min(100, 100 * price / market)}%`}} />
        </span>
      </div>
    </div>
  );
}

export const cardClass = 'bg-surface border border-line rounded-[20px]';
