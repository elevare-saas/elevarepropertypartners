import {useRef, useState} from 'react';
import {AREAS, CONFIG} from '../../concierge/data';
import {thb} from '../../concierge/engine';
import {browse} from '../../concierge/actions';
import {areaFacts, priceLevel} from '../../concierge/content';
import {areaPhoto} from '../../concierge/photos';
import {Cta, cx, eyebrow} from '../ui';
import {cardClass, Heading, Band} from './parts';
import PriceCheck from './PriceCheck';

/* schematic island, not to scale: enough to tell west-coast beaches from the south and the town */
const PINS: Record<string, [number, number, 'l' | 'r']> = {
  'Bang Tao': [68, 92, 'r'], 'Cape Yamu': [156, 100, 'l'], 'Surin': [64, 114, 'r'], 'Kamala': [66, 136, 'r'], 'Patong': [70, 164, 'r'],
  'Karon': [70, 196, 'r'], 'Kata': [72, 216, 'r'], 'Chalong': [116, 236, 'r'], 'Phuket Town': [150, 182, 'l'], 'Nai Harn': [74, 264, 'r'], 'Rawai': [98, 272, 'r']
};
const ISLAND = 'M112 6C124 18 132 40 140 62C150 70 170 84 162 104C154 116 150 130 158 150C166 168 172 186 164 204C156 220 160 236 148 246C134 256 122 250 112 262C102 276 92 292 76 296C62 298 58 284 62 270C66 252 58 240 60 222C62 204 52 196 56 180C60 164 50 152 54 136C58 118 46 104 52 88C58 70 66 50 80 32C90 18 100 8 112 6Z';

function IslandMap({sel, onPick}: {sel: string; onPick: (k: string) => void}) {
  return (
    /* the reel is the accessible control; the map mirrors it for pointer users */
    <svg viewBox="20 0 190 304" aria-hidden="true" className="block w-full h-auto">
      <path d={ISLAND} fill="var(--color-surface-2)" stroke="var(--color-line)" strokeWidth="1.5" />
      {/* the selected pin draws last, so its label sits on top */}
      {Object.entries(PINS).sort(([a], [b]) => +(a === sel) - +(b === sel)).map(([k, [x, y, side]]) => {
        const on = k === sel;
        return (
          <g key={k} onClick={() => onPick(k)} className="cursor-pointer">
            <circle cx={x} cy={y} r={on ? 6 : 3.5} fill={on ? 'var(--color-pink)' : 'var(--color-muted)'} />
            <circle cx={x} cy={y} r="10" fill="transparent" />
            {on && <>
              <circle cx={x} cy={y} r="11" fill="none" stroke="var(--color-pink)" strokeOpacity=".45" />
              <text x={side === 'r' ? x + 15 : x - 15} y={y + 4} textAnchor={side === 'r' ? 'start' : 'end'} fontSize="13" fill="var(--color-ink)" fontWeight="700">{k}</text>
            </>}
          </g>
        );
      })}
    </svg>
  );
}

const Stat = ({label, value, unit}: {label: string; value: string; unit: string}) => (
  <div className="bg-surface-2 rounded-[14px] py-[12px] px-[14px]">
    <div className="text-[12px] text-muted">{label}</div>
    <div className="font-mono tabular-nums text-[17px] mt-[4px]">{value}<small className="text-muted text-[12px] font-body"> {unit}</small></div>
  </div>
);

/* swipeable photo cards, one per area, ordered by price level */
function Reel({sel, onPick}: {sel: string; onPick: (k: string) => void}) {
  const track = useRef<HTMLDivElement>(null);
  const nudge = (d: number) => track.current?.scrollBy({left: d * 300, behavior: 'smooth'});
  const arrow = 'w-[44px] h-[44px] rounded-full border border-line bg-surface text-ink text-[18px] cursor-pointer hover:border-muted';
  return (
    <div className="relative">
      <div className="flex justify-end gap-[8px] mb-[14px]">
        <button type="button" className={arrow} aria-label="Previous areas" onClick={() => nudge(-1)}>←</button>
        <button type="button" className={arrow} aria-label="More areas" onClick={() => nudge(1)}>→</button>
      </div>
      <div ref={track} role="group" aria-label="Choose an area"
        className="no-scrollbar flex gap-[14px] overflow-x-auto snap-x snap-mandatory pb-[4px] mr-[calc(50%-50vw)] pr-[20px] from760:pr-[36px]">
        {[...AREAS].sort((x, y) => y.f - x.f).map(x => {
          const ph = areaPhoto(x.k), on = x.k === sel, d = Math.round((x.f - 1) * 100);
          return (
            <button key={x.k} type="button" aria-pressed={on} onClick={() => onPick(x.k)}
              className={cx('group relative snap-start shrink-0 w-[248px] h-[340px] upto480:w-[78vw] rounded-[22px] overflow-hidden border-0 p-0 cursor-pointer text-left text-white',
                'outline-offset-[3px] [transition:transform_.3s]', on ? 'outline-2 outline-pink [outline-style:solid]' : 'hover:[transform:translateY(-4px)]')}>
              <img src={ph.src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover [transition:transform_.8s] group-hover:[transform:scale(1.06)]" />
              <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,9,0)_35%,rgba(5,4,9,.88)_100%)]" />
              <span className="absolute top-[12px] left-[12px] bg-[rgba(5,4,9,.6)] backdrop-blur-[6px] rounded-full py-[4px] px-[10px] text-[11.5px] font-mono">
                {Math.round(x.f * 100)} · {d > 0 ? '+' : ''}{d}%
              </span>
              <span className="absolute inset-x-[16px] bottom-[16px] grid gap-[4px]">
                <b className="font-display font-medium text-[30px] leading-none">{x.k}</b>
                <small className="text-[12.5px] text-[rgba(245,242,250,.85)]">{x.d}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AreaDetail({k, onPick}: {k: string; onPick: (k: string) => void}) {
  const a = areaFacts(k), ph = areaPhoto(k);
  return (
    <article className={cardClass + ' mt-[18px] p-[22px] grid gap-[22px] from1000:grid-cols-[minmax(0,1fr)_170px]'} aria-live="polite">
      <div className="grid gap-[16px] content-start">
        <div className="grid gap-[6px]">
          <span className={eyebrow}>{priceLevel(a.f)} · {a.f > 1 ? '+' : ''}{Math.round((a.f - 1) * 100)}% vs island</span>
          <h3 className="m-0 font-display font-medium text-[40px] leading-none">{a.k}</h3>
          <p className="m-0 text-muted text-[15px]">{a.d}. <span className="text-faint text-[12.5px]">Photo: {ph.caption}.</span></p>
        </div>
        {a.bestFor.length > 0 && (
          <div className="flex flex-wrap gap-[6px]">
            <span className="text-[12px] text-faint self-center">Popular with</span>
            {a.bestFor.map(b => <span key={b} className="py-[2px] px-[9px] rounded-full bg-[rgba(122,63,224,.2)] text-lilac font-semibold text-[12px]">{b}</span>)}
          </div>
        )}
        <div className="grid gap-[8px] grid-cols-3 upto560:grid-cols-1">
          <Stat label="1-bed condo, typical rent" value={thb(a.condo1)} unit="/mo" />
          <Stat label="3-bed pool villa, typical rent" value={thb(a.villa3)} unit="/mo" />
          <Stat label="Condo to buy, typical" value={thb(a.condoSqm)} unit="/m²" />
        </div>
        <div className="flex flex-wrap gap-[10px] items-center">
          {a.homes.rent > 0 && <Cta size="sm" onClick={() => browse('rent', a.k)}>See {a.homes.rent} rental{a.homes.rent > 1 ? 's' : ''} in {a.k} →</Cta>}
          {a.homes.buy > 0 && <Cta size="sm" secondary onClick={() => browse('buy', a.k)}>{a.homes.buy} for sale →</Cta>}
          {!a.homes.rent && !a.homes.buy && <span className="text-[13px] text-muted">No homes listed in {a.k} right now. Tell us what you need and we’ll look for you.</span>}
        </div>
        <p className="m-0 text-[11.5px] text-faint">{CONFIG.marketNote}</p>
      </div>
      <div className="upto999:hidden"><IslandMap sel={k} onPick={onPick} /></div>
    </article>
  );
}

export default function AreaGuide() {
  const [sel, setSel] = useState('Kata');
  const [tab, setTab] = useState<'areas' | 'price'>('areas');
  const tabBtn = 'border-0 bg-transparent py-[10px] px-[2px] text-[15px] cursor-pointer text-muted [border-bottom:2px_solid_transparent] aria-selected:text-ink aria-selected:[border-bottom-color:var(--color-pink)] aria-selected:font-semibold';
  return (
    <Band id="areas" label="areas-h">
      <div className="flex flex-wrap justify-between items-end gap-[20px]">
        <Heading id="areas-h" kicker="Market intelligence" title="Eleven areas, one scale. See where your money goes further."
          sub="Each area’s price index against the island average, with typical rents and prices. Swipe, pick one, or check a fair price." />
        <div role="tablist" aria-label="Market view" className="flex gap-[24px] [border-bottom:1px_solid_var(--color-line)]">
          <button type="button" role="tab" id="t-areas" aria-controls="p-areas" aria-selected={tab === 'areas'} className={tabBtn} onClick={() => setTab('areas')}>Areas</button>
          <button type="button" role="tab" id="t-price" aria-controls="p-price" aria-selected={tab === 'price'} className={tabBtn} onClick={() => setTab('price')}>Fair-price check</button>
        </div>
      </div>
      <div id="prices" className="scroll-mt-[90px]" />
      <div className="mt-[34px]">
        <div role="tabpanel" id="p-areas" aria-labelledby="t-areas" hidden={tab !== 'areas'}>
          <Reel sel={sel} onPick={setSel} />
          <AreaDetail k={sel} onPick={setSel} />
        </div>
        <div role="tabpanel" id="p-price" aria-labelledby="t-price" hidden={tab !== 'price'}>
          <PriceCheck />
        </div>
      </div>
    </Band>
  );
}
