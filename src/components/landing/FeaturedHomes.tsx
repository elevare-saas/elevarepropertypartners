import {useState} from 'react';
import {TYPES, type Mode} from '../../concierge/data';
import {big, thb} from '../../concierge/engine';
import {browse, openListing} from '../../concierge/actions';
import {byValue, COUNTS} from '../../concierge/content';
import {Art, Cta} from '../ui';
import {ModeSwitch, Section} from './parts';

export default function FeaturedHomes() {
  const [mode, setMode] = useState<Mode>('rent');
  const fmt = mode === 'rent' ? thb : big, per = mode === 'rent' ? '/mo' : '';
  return (
    <Section id="homes" tone="paper" kicker="Portfolio" title="Our homes, best value first."
      sub="Every price is compared with typical asking prices for the same area, type and size. Tap a home to see why.">
      <div className="flex flex-wrap justify-between items-center gap-[12px]">
        <ModeSwitch mode={mode} onChange={setMode} label="Rentals or sales" />
        <span className="text-[12px] text-faint">Sample listings · illustrative photos</span>
      </div>
      <ul className="list-none m-0 mt-[16px] p-0 grid gap-[12px] grid-cols-[repeat(auto-fill,minmax(250px,1fr))] from1000:grid-cols-3">
        {byValue(mode).slice(0, 6).map(({p, c}) => (
          <li key={p.id}>
            <button type="button" onClick={() => openListing(p.id)}
              className="w-full h-full text-left bg-surface border border-line rounded-[20px] overflow-hidden p-0 cursor-pointer grid content-start [transition:border-color_.15s,transform_.15s] hover:border-violet hover:[transform:translateY(-2px)]">
              <span className="block aspect-[4/3] relative overflow-hidden">
                <Art p={p} k="f" />
                {c.diff > 0 && <span className="absolute bottom-[10px] left-[10px] bg-[rgba(5,4,9,.8)] text-[#6FD39A] rounded-full py-[4px] px-[10px] text-[12px] font-bold backdrop-blur-[4px]">{c.pct}% below market</span>}
              </span>
              <span className="grid gap-[4px] py-[14px] px-[16px]">
                <span className="flex justify-between items-baseline gap-[10px]">
                  <b className="text-[15.5px]">{p.name}</b>
                  <span className="font-mono tabular-nums text-[14px] whitespace-nowrap">{fmt(p.price)}<small className="text-muted">{per}</small></span>
                </span>
                <small className="text-muted text-[12.5px]">{p.area} · {p.beds} bed {TYPES[p.type].toLowerCase()} · {p.sqm} m²</small>
                <small className="text-faint text-[12px] mt-[2px]">{mode === 'rent' ? p.ex.join(' · ') : `${p.own} · est. yield ${(c.yield * 100).toFixed(1)}%`}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-[18px]">
        <Cta size="sm" secondary onClick={() => browse(mode)}>See all {mode === 'rent' ? COUNTS.rent + ' rentals' : COUNTS.buy + ' homes for sale'} →</Cta>
      </div>
    </Section>
  );
}
