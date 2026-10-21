import {chooseMode} from '../../concierge/actions';
import {SERVICES} from '../../concierge/content';
import {photo} from '../../concierge/photos';
import {Cta} from '../ui';
import {Pic, Section} from './parts';

const PHOTO = {rent: 'villa-loungers', buy: 'condo-tower', own: 'villa-hills'} as const;

export default function Services() {
  return (
    <Section id="services" tone="paper" kicker="What we do" title="Live here, buy here, or earn here."
      sub="Rent it, buy it, or let us run it. The same team and the same market data, with one advisor from first message to keys."
      className="pt-[8px] pb-[104px] upto600:pb-[72px]">
      <div className="grid gap-[18px] from1000:grid-cols-3">
        {SERVICES.map((s, i) => (
          <article key={s.k} className="group bg-surface border border-line rounded-[24px] overflow-hidden grid content-start">
            <div className="overflow-hidden">
              <Pic ph={photo(PHOTO[s.k])} caption={false} className="aspect-[16/10] rounded-none! [transition:transform_.8s_cubic-bezier(.2,.7,.2,1)] group-hover:[transform:scale(1.04)]" />
            </div>
            <div className="p-[26px] grid gap-[12px] content-start">
              <span className="flex items-center justify-between">
                <span className="text-[11px] tracking-[.18em] uppercase text-pink font-semibold">{s.kicker}</span>
                <span className="font-mono text-[12px] text-faint">0{i + 1}</span>
              </span>
              <h3 className="m-0 font-display font-medium text-[29px] leading-[1.08]">{s.title}</h3>
              <p className="m-0 text-muted text-[14.5px]">{s.text}</p>
              <ul className="list-none m-0 p-0 grid gap-[7px] text-[14px] [border-top:1px_solid_var(--color-line)] pt-[14px]">
                {s.points.map(x => <li key={x} className="before:content-['✓_'] before:text-good before:font-bold">{x}</li>)}
              </ul>
              <div className="mt-[8px]">
                {s.k === 'own'
                  ? <a href="#owners" className="inline-flex rounded-full py-[9px] px-[18px] text-[13px] font-bold no-underline text-white bg-grad">See the owner view →</a>
                  : <Cta size="sm" onClick={() => chooseMode(s.k)}>{s.k === 'rent' ? 'Find a rental' : 'Find a property'} →</Cta>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
