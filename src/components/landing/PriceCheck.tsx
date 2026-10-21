import {useState} from 'react';
import {AREAS, CONFIG, TYPES, type Listing, type Mode} from '../../concierge/data';
import {big, marketFor, thb} from '../../concierge/engine';
import {openListing, startQuiz} from '../../concierge/actions';
import {comparables} from '../../concierge/content';
import {Chip, Chips, Ghost} from '../ui';
import {cardClass, ModeSwitch, PriceBars} from './parts';

const stepBtn = 'w-[40px] h-[40px] rounded-full border border-line bg-surface-2 text-[20px] cursor-pointer';
const label = 'text-[12px] text-muted';

/* "what's a fair price?": the market estimate for any area, type and size, then our homes against it */
export default function PriceCheck() {
  const [mode, setMode] = useState<Mode>('rent');
  const [area, setArea] = useState('Kamala');
  const [type, setType] = useState<Listing['type']>('villa');
  const [beds, setBeds] = useState(2);
  const [sqm, setSqm] = useState(120);
  const fmt = mode === 'rent' ? thb : big;
  const m = marketFor(mode, area, type, beds, sqm);
  const comps = comparables(mode, area, type);

  return (
    <>
      <div className={cardClass + ' p-[20px] grid gap-[20px] from1000:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'}>
        <div className="grid gap-[16px] content-start">
          <div><ModeSwitch mode={mode} onChange={setMode} label="Rent or buy" /></div>
          <div className="grid gap-[6px]">
            <label htmlFor="pcArea" className={label}>Area</label>
            <select id="pcArea" value={area} onChange={e => setArea(e.target.value)}
              className="w-full h-[42px] rounded-[10px] border border-line bg-surface-2 px-[12px] text-[15px] text-ink cursor-pointer">
              {AREAS.map(a => <option key={a.k} value={a.k}>{a.k}</option>)}
            </select>
          </div>
          <div className="grid gap-[6px]">
            <span className={label} id="pcTypeL">Type</span>
            <Chips>{Object.entries(TYPES).map(([k, l]) => <Chip key={k} pressed={type === k} onClick={() => setType(k as Listing['type'])}>{l}</Chip>)}</Chips>
          </div>
          {mode === 'rent' ? (
            <div className="grid gap-[6px]">
              <span className={label}>Bedrooms</span>
              <div className="flex items-center gap-[16px]">
                <button type="button" className={stepBtn} aria-label="Fewer bedrooms" onClick={() => setBeds(b => Math.max(1, b - 1))}>−</button>
                <output className="font-display text-[34px] leading-none w-[1.2em] text-center" aria-live="polite">{beds}</output>
                <button type="button" className={stepBtn} aria-label="More bedrooms" onClick={() => setBeds(b => Math.min(6, b + 1))}>+</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-[6px]">
              <label htmlFor="pcSqm" className={label}>Size: <b className="text-ink font-mono">{sqm} m²</b></label>
              <input type="range" id="pcSqm" min={30} max={600} step={10} value={sqm} onChange={e => setSqm(+e.target.value)} />
            </div>
          )}
        </div>

        <div className="grid gap-[14px] content-start" aria-live="polite">
          <div className="bg-surface-2 rounded-[14px] p-[16px]">
            <div className={label}>Typical asking {mode === 'rent' ? 'rent' : 'price'}, {mode === 'rent' ? `${beds}-bed ` : `${sqm} m² `}{TYPES[type].toLowerCase()} in {area}</div>
            <div className="font-display text-[44px] leading-[1.1] mt-[4px] tabular-nums">{fmt(m)}<small className="text-muted text-[16px] font-body">{mode === 'rent' ? ' / month' : ''}</small></div>
          </div>
          {comps.length ? comps.map(({p, c}) => (
            <div key={p.id} className="grid gap-[8px] [border-top:1px_solid_var(--color-line)] pt-[12px]">
              <div className="flex justify-between gap-[10px] flex-wrap items-baseline">
                <b className="text-[14.5px]">{p.name} <small className="text-muted font-normal">· {p.beds} bed · {p.sqm} m²</small></b>
                <span className={c.diff > 0 ? 'text-good font-bold text-[13px]' : 'text-muted text-[13px]'}>{c.diff > 0 ? `${fmt(c.diff)} below its market` : 'At market'}</span>
              </div>
              <PriceBars market={c.m} price={p.price} label={`Typical for this home (${p.beds} bed, ${p.sqm} m²)`} fmt={fmt} />
              <Ghost className="justify-self-start" onClick={() => openListing(p.id)}>View {p.name}</Ghost>
            </div>
          )) : (
            <p className="m-0 text-[13.5px] text-muted">
              We don’t have a {TYPES[type].toLowerCase()} {mode === 'rent' ? 'to rent' : 'for sale'} in {area} listed right now.{' '}
              <Ghost onClick={startQuiz}>Tell us what you need</Ghost> and we’ll look for one.
            </p>
          )}
          <p className="m-0 text-[11.5px] text-faint">{CONFIG.marketNote}</p>
        </div>
      </div>
    </>
  );
}
