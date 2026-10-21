import {useState} from 'react';
import {AREAS} from '../../concierge/data';
import {thb} from '../../concierge/engine';
import {askGo, openListing} from '../../concierge/actions';
import {byValue, COUNTS} from '../../concierge/content';
import {photo} from '../../concierge/photos';
import {Art, Cta, eyebrow} from '../ui';
import {wrap} from './parts';

const QUICK = ['Pool villa in Bang Tao, 12 months', '1 bed near coworking in Rawai', 'Freehold sea-view condo to buy'];

/* the concierge, started straight from the hero */
function AskBar() {
  const [v, setV] = useState('');
  return (
    <form role="search" aria-label="Describe the home you want" onSubmit={e => { e.preventDefault(); askGo(v); }}
      className="flex items-center gap-[8px] bg-[rgba(17,14,24,.62)] backdrop-blur-[14px] border border-[rgba(255,255,255,.14)] rounded-full p-[6px] pl-[20px] max-w-[580px] shadow-[0_20px_60px_rgba(0,0,0,.35)]">
      <label htmlFor="heroAsk" className="sr-only">Describe the home you want</label>
      <input id="heroAsk" type="text" value={v} onChange={e => setV(e.target.value)} autoComplete="off"
        placeholder="Describe the home you want…"
        className="flex-1 min-w-0 border-0! bg-transparent! p-0! text-[16px] text-white placeholder:text-[rgba(245,242,250,.6)] outline-none" />
      <Cta type="submit" size="sm" className="whitespace-nowrap py-[12px]!">Match me →</Cta>
    </form>
  );
}

/* a real sample match, floating on the photo */
function MatchCard() {
  const {p, c} = byValue('rent')[0];
  return (
    <button type="button" onClick={() => openListing(p.id)} aria-label={`Example match: ${p.name}, ${c.pct}% below market`}
      className="upto999:hidden absolute right-[36px] bottom-[150px] w-[300px] text-left cursor-pointer p-0 overflow-hidden rounded-[20px] border border-[rgba(255,255,255,.16)] bg-[rgba(17,14,24,.7)] backdrop-blur-[16px] shadow-[0_30px_80px_rgba(0,0,0,.45)] [transition:transform_.25s] hover:[transform:translateY(-4px)]">
      <span className="block aspect-[16/9] relative">
        <Art p={p} eager />
        <span className="absolute top-[10px] left-[10px] bg-[rgba(5,4,9,.7)] text-white rounded-full py-[3px] px-[10px] text-[11px] font-bold">Example match</span>
      </span>
      <span className="grid gap-[6px] p-[14px]">
        <span className="flex justify-between items-baseline gap-[8px]">
          <b className="font-display font-medium text-[20px] leading-[1.05]">{p.name}</b>
          <span className="font-mono text-[13px] whitespace-nowrap">{thb(p.price)}<small className="text-muted">/mo</small></span>
        </span>
        <span className="block h-[6px] rounded-[3px] bg-line overflow-hidden"><i className="block h-full bg-grad rounded-[3px]" style={{width: `${100 - c.pct}%`}} /></span>
        <span className="text-good text-[12.5px] font-bold">{c.pct}% below the {p.area} average</span>
      </span>
    </button>
  );
}

/* area price index, island average = 100 */
function Ticker() {
  const row = [...AREAS].sort((a, b) => b.f - a.f).map(a => {
    const d = Math.round((a.f - 1) * 100);
    return (
      <span key={a.k} className="flex items-center gap-[10px] px-[22px] whitespace-nowrap text-[13px]">
        <b className="font-semibold">{a.k}</b>
        <span className="font-mono tabular-nums text-[rgba(245,242,250,.7)]">{Math.round(a.f * 100)}</span>
        <span className={'font-mono tabular-nums text-[12px] ' + (d > 0 ? 'text-[#F29BD6]' : d < 0 ? 'text-good' : 'text-[rgba(245,242,250,.6)]')}>{d > 0 ? '+' + d : d}%</span>
      </span>
    );
  });
  return (
    <div className="flex items-center gap-[16px] overflow-hidden py-[14px] [border-top:1px_solid_rgba(255,255,255,.12)]">
      <span className="shrink-0 text-[10.5px] tracking-[.2em] uppercase text-[rgba(245,242,250,.65)] font-semibold">Area price index<br />island = 100</span>
      <div className="ticker overflow-hidden min-w-0 flex-1" aria-label="Area price index, island average 100">
        <div className="ticker-track"><div className="flex">{row}</div><div className="flex" aria-hidden="true">{row}</div></div>
      </div>
    </div>
  );
}

export default function Hero() {
  const ph = photo('hero');
  return (
    <section aria-labelledby="hero-h" className="relative isolate overflow-hidden min-h-[max(680px,100svh)] flex flex-col text-white">
      <img src={ph.src} width={ph.w} height={ph.h} alt="" fetchPriority="high" className="kenburns absolute inset-0 -z-20 w-full h-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,4,9,.86)_0%,rgba(5,4,9,.55)_45%,rgba(5,4,9,.1)_75%),linear-gradient(0deg,rgba(5,4,9,.95)_0%,rgba(5,4,9,0)_38%)] upto759:bg-[linear-gradient(0deg,rgba(5,4,9,.96)_10%,rgba(5,4,9,.55)_60%,rgba(5,4,9,.35)_100%)]" />

      <div className={wrap + ' w-full flex-1 flex flex-col justify-end pt-[120px] pb-[36px]'}>
        <div className={eyebrow + ' animate-rise text-[rgba(245,242,250,.78)]!'}>Elevare Property Partners · Phuket</div>
        <h1 id="hero-h" className="animate-rise text-[clamp(52px,9vw,120px)] leading-[.92] mt-[18px] tracking-[-.02em]">
          Phuket property,<br /><span className="grad-text italic pr-[.08em]">elevated.</span>
        </h1>
        <p className="animate-rise m-0 mt-[22px] text-[18px] max-w-[46ch] text-[rgba(245,242,250,.86)] upto600:text-[16px]">
          Homes to rent, buy and own across {COUNTS.areas} areas of the island, every one priced against the market before you see it.
        </p>
        <div className="animate-rise mt-[28px] grid gap-[12px]">
          <AskBar />
          <div className="flex flex-wrap gap-[8px] items-center text-[12.5px]">
            <span className="text-[rgba(245,242,250,.7)]">Try</span>
            {QUICK.map(q => (
              <button key={q} type="button" onClick={() => askGo(q)}
                className="border border-[rgba(255,255,255,.2)] bg-[rgba(255,255,255,.06)] text-white rounded-full py-[6px] px-[12px] cursor-pointer hover:bg-[rgba(255,255,255,.14)]">{q}</button>
            ))}
          </div>
        </div>
        <div className="mt-[44px]"><Ticker /></div>
      </div>
      <MatchCard />
      <span className="absolute right-[16px] top-[84px] text-[10.5px] text-[rgba(245,242,250,.6)]">{ph.caption}</span>
    </section>
  );
}
