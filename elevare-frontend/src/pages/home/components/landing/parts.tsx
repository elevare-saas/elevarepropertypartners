import type {ReactNode} from 'react';
import {chooseMode} from '@/concierge/actions';
import {hasHomes, type Mode} from '@/concierge/data';
import {cx} from '@/lib/format';

/* page grid: one content width, generous gutters */
export const wrap = 'max-w-[1200px] mx-auto px-[20px] from760:px-[36px]';

/* full-bleed band: "paper" re-tones every token to warm ivory */
export function Band({
  id,
  tone = 'dark',
  children,
  className,
  label
}: {
  id?: string;
  tone?: 'dark' | 'paper';
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={label}
      className={cx(
        'relative scroll-mt-[64px]',
        tone === 'paper' ? 'paper' : 'bg-bg',
        className ?? 'py-[96px] upto600:py-[64px]'
      )}
    >
      <div data-reveal className={wrap}>
        {children}
      </div>
    </section>
  );
}

export function Heading({
  id,
  title,
  sub,
  className
}: {
  id?: string;
  title: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h2 id={id} className="text-[clamp(32px,4.4vw,52px)] max-w-[22ch]">
        {title}
      </h2>
      {sub && <p className="text-muted text-[16.5px] mt-[14px] mb-0 max-w-[58ch]">{sub}</p>}
    </div>
  );
}

const MODE_LABEL: Record<Mode, string> = {rent: 'Rent a home', buy: 'Buy a home'};
const SECOND = {
  photo: 'text-white bg-[rgba(255,255,255,.08)] border border-[rgba(255,255,255,.35)] backdrop-blur-[8px]',
  dark: 'text-ink bg-surface-2 border border-line hover:border-violet',
  paper: 'text-ink bg-transparent border border-[color:var(--color-ink)]'
};

/* the two ways in: start the concierge for renting or buying (only modes that have homes) */
export function ModeButtons({tone = 'dark', className}: {tone?: keyof typeof SECOND; className?: string}) {
  const modes = (['rent', 'buy'] as Mode[]).filter(hasHomes);
  if (!modes.length) return null;
  return (
    <div className={cx('flex flex-wrap gap-[10px]', className)}>
      {modes.map((m, i) => (
        <button
          key={m}
          type="button"
          onClick={() => chooseMode(m)}
          className={cx(
            'rounded-full py-[14px] px-[26px] text-[16px] font-semibold cursor-pointer [transition:transform_.15s] hover:[transform:translateY(-2px)]',
            i === 0 ? 'text-white border-0 bg-grad shadow-[0_14px_40px_rgba(192,79,208,.35)]' : SECOND[tone]
          )}
        >
          {MODE_LABEL[m]} →
        </button>
      ))}
    </div>
  );
}
