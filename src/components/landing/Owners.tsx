import {useState} from 'react';
import {AREAS, CONFIG, TYPES, type Listing} from '../../concierge/data';
import {big, marketFor, thb} from '../../concierge/engine';
import {openListing} from '../../concierge/actions';
import {incomeView, OWNERSHIP} from '../../concierge/content';
import {Chip, Chips, cx} from '../ui';
import {cardClass, Pic, Section} from './parts';
import {photo} from '../../concierge/photos';

const label = 'text-[12px] text-muted';
const stepBtn = 'w-[36px] h-[36px] rounded-full border border-line bg-surface-2 text-[18px] cursor-pointer';
const typical = CONFIG.avgYield;
/* a sensible floor area for a type and bedroom count; the slider fine-tunes it */
const sqmFor = (t: Listing['type'], b: number) => ({condo: 45 + 30 * (b - 1), villa: 110 + 70 * (b - 1), townhouse: 90 + 45 * (b - 1)})[t];

const ownerMsg = encodeURIComponent(`Hi ${CONFIG.brand}, I own a property in Phuket and would like to talk about renting it out and managing it.`);

/* the portfolio read as income: every sale listing by estimated gross yield */
function IncomeView() {
  const rows = incomeView(), scale = 0.08;
  return (
    <div className={cardClass + ' p-[20px] grid gap-[14px] content-start'}>
      <div className="flex justify-between items-baseline gap-[10px] flex-wrap">
        <b className="text-[15px]">Income view</b>
        <span className="text-[12px] text-faint">Est. gross yield · typical {(typical * 100).toFixed(1)}%</span>
      </div>
      <ul className="list-none m-0 p-0 grid">
        {rows.map(({p, y}) => (
          <li key={p.id}>
            <button type="button" onClick={() => openListing(p.id)}
              className="w-full text-left bg-transparent border-0 [border-top:1px_solid_var(--color-line)] py-[11px] px-0 cursor-pointer grid gap-[6px] grid-cols-[minmax(0,1fr)_auto] items-center hover:[&_b]:text-pink">
              <span className="min-w-0">
                <b className="block text-[14px] truncate [transition:color_.15s]">{p.name}</b>
                <small className="text-muted text-[12px]">{p.area} · {big(p.price)} · rents ~{thb(p.rent)}/mo</small>
              </span>
              <span className="font-mono tabular-nums text-[15px] text-good">{(y * 100).toFixed(1)}%</span>
              <span className="col-[1/-1] relative block h-[6px] rounded-[3px] bg-line">
                <i className="block h-full rounded-[3px] bg-grad" style={{width: `${Math.min(100, 100 * y / scale)}%`}} />
                <i aria-hidden="true" className="absolute top-[-3px] h-[12px] w-[2px] bg-muted" style={{left: `${100 * typical / scale}%`}} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="m-0 text-[11.5px] text-faint">The grey tick marks the typical {(typical * 100).toFixed(1)}% yield. Rents are estimates for each home. {CONFIG.marketNote}</p>
    </div>
  );
}

/* "what could my property earn?": market value and rent for any area, type and size */
function YieldEstimator() {
  const [area, setArea] = useState('Bang Tao');
  const [type, setType] = useState<Listing['type']>('villa');
  const [beds, setBeds] = useState(3);
  const [sqm, setSqm] = useState(sqmFor('villa', 3));
  const pickType = (t: Listing['type']) => { setType(t); setSqm(sqmFor(t, beds)); };
  const stepBeds = (dlt: number) => { const b = Math.min(6, Math.max(1, beds + dlt)); setBeds(b); setSqm(sqmFor(type, b)); };
  const value = marketFor('buy', area, type, beds, sqm), rent = marketFor('rent', area, type, beds, sqm), y = rent * 12 / value;
  return (
    <div className={cardClass + ' p-[20px] grid gap-[16px] content-start'}>
      <b className="text-[15px]">What could your property earn?</b>
      <div className="grid gap-[14px] grid-cols-2 upto480:grid-cols-1">
        <div className="grid gap-[6px] col-[1/-1]">
          <label htmlFor="yeArea" className={label}>Area</label>
          <select id="yeArea" value={area} onChange={e => setArea(e.target.value)}
            className="w-full h-[42px] rounded-[10px] border border-line bg-surface-2 px-[12px] text-[15px] text-ink cursor-pointer">
            {AREAS.map(a => <option key={a.k} value={a.k}>{a.k}</option>)}
          </select>
        </div>
        <div className="grid gap-[6px] col-[1/-1]">
          <span className={label}>Type</span>
          <Chips>{Object.entries(TYPES).map(([k, l]) => <Chip key={k} pressed={type === k} onClick={() => pickType(k as Listing['type'])}>{l}</Chip>)}</Chips>
        </div>
        <div className="grid gap-[6px]">
          <span className={label}>Bedrooms</span>
          <div className="flex items-center gap-[14px]">
            <button type="button" className={stepBtn} aria-label="Fewer bedrooms" onClick={() => stepBeds(-1)}>−</button>
            <output className="font-display text-[30px] leading-none w-[1em] text-center">{beds}</output>
            <button type="button" className={stepBtn} aria-label="More bedrooms" onClick={() => stepBeds(1)}>+</button>
          </div>
        </div>
        <div className="grid gap-[6px]">
          <label htmlFor="yeSqm" className={label}>Size: <b className="text-ink font-mono">{sqm} m²</b></label>
          <input type="range" id="yeSqm" min={30} max={800} step={10} value={sqm} onChange={e => setSqm(+e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-[8px] upto480:grid-cols-1" aria-live="polite">
        {[['Est. market value', big(value)], ['Est. monthly rent', thb(rent)], ['Est. gross yield', (y * 100).toFixed(1) + '%']].map(([l, v], i) => (
          <div key={l} className={cx('rounded-[12px] py-[12px] px-[14px]', i === 2 ? 'bg-[rgba(111,211,154,.1)] border border-[rgba(111,211,154,.3)]' : 'bg-surface-2')}>
            <div className="text-[11.5px] text-muted">{l}</div>
            <div className={cx('font-mono tabular-nums text-[17px] mt-[4px]', i === 2 && 'text-good')}>{v}</div>
          </div>
        ))}
      </div>
      <p className="m-0 text-[11.5px] text-faint">Indicative, before costs, from typical asking prices for the area. We’ll give you a proper figure for your own property.</p>
    </div>
  );
}

export default function Owners() {
  return (
    <Section id="owners" tone="paper" kicker="Owners & investors" title="Own in Phuket. We’ll run it like an asset."
      sub="Every home we sell shows its estimated rental yield. If you already own here, we price your rent against the market, find tenants through our concierge and manage the rental.">
      <Pic ph={photo('villa-sea')} className="aspect-[21/8] upto600:aspect-[4/3] mb-[18px]" />
      <div className="grid gap-[14px] from1000:grid-cols-2 items-start">
        <IncomeView />
        <YieldEstimator />
      </div>
      <ul className="list-none m-0 mt-[14px] p-0 grid gap-[10px] from760:grid-cols-3">
        {OWNERSHIP.map(([t, k, d]) => (
          <li key={t} className="bg-surface border border-line rounded-[16px] p-[18px] grid gap-[6px] content-start">
            <span className="text-[11px] tracking-[.16em] uppercase text-pink font-semibold">{k}</span>
            <b className="font-display font-medium text-[22px] leading-[1.1]">{t}</b>
            <span className="text-[13.5px] text-muted">{d}</span>
          </li>
        ))}
      </ul>
      <div className="mt-[14px] flex flex-wrap justify-between items-center gap-[14px] rounded-[16px] bg-surface-2 py-[16px] px-[20px]">
        <span className="text-[14.5px]"><b>Own a property already?</b> <span className="text-muted">Tell us about it and an advisor will come back with a rent and a plan.</span></span>
        <a href={`https://wa.me/${CONFIG.whatsapp}?text=${ownerMsg}`} target="_blank" rel="noopener"
          className="inline-flex rounded-full py-[11px] px-[20px] text-[14px] font-bold no-underline text-wa-ink bg-wa whitespace-nowrap">Talk to us on WhatsApp</a>
      </div>
    </Section>
  );
}
