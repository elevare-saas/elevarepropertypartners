import {useState} from 'react';
import {BUYERS, PERSONAS, type Mode} from '../../concierge/data';
import {browse, chooseMode, startAs} from '../../concierge/actions';
import {COUNTS} from '../../concierge/content';
import {chipClass, Cta, eyebrow, Ghost} from '../ui';
import AskBox from './AskBox';
import {Band, ModeSwitch} from './parts';

/* the journey's payoff: the visitor runs the concierge themselves */
export default function Experience() {
  const [mode, setMode] = useState<Mode>('rent');
  const who = mode === 'rent' ? Object.entries(PERSONAS).map(([k, p]) => [k, p.l]) : BUYERS.map(b => [b.k, b.l]);
  return (
    <Band id="try" label="try-h" className="pt-0 pb-[104px] upto600:pb-[72px]">
    <div className="relative overflow-hidden rounded-[28px] grad-border-surface border">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgba(224,92,181,.18),transparent_70%),radial-gradient(50%_70%_at_0%_100%,rgba(85,182,242,.12),transparent_70%)]" />
      <div className="relative grid gap-[28px] p-[36px] upto600:p-[20px] from1000:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] from1000:items-center">
        <div className="grid gap-[14px] content-start">
          <span className={eyebrow}>Your turn</span>
          <h2 id="try-h" className="text-[clamp(34px,4.6vw,54px)]">You’ve seen the journey. <span className="grad-text italic">Want to try it?</span></h2>
          <p className="m-0 text-muted text-[15.5px] max-w-[44ch]">Describe what you need and press Enter. You’ll see your matches, priced against the market, in about a minute. No sign-up.</p>
        </div>
        <div className="grid gap-[18px] min-w-0">
          <AskBox />
          <div className="flex gap-[10px] items-center flex-wrap text-[13.5px] text-muted">
            <span>Or tap through:</span>
            <Cta size="sm" secondary onClick={() => chooseMode('rent')}>I want to rent</Cta>
            <Cta size="sm" secondary onClick={() => chooseMode('buy')}>I want to buy</Cta>
            <Ghost onClick={() => browse('rent')}>Browse all {COUNTS.rent} rentals</Ghost>
          </div>
          <div className="grid gap-[10px] [border-top:1px_solid_var(--color-line)] pt-[16px]">
            <div className="flex flex-wrap justify-between items-center gap-[10px]">
              <span className="text-[13px] text-muted">Or start from who you are</span>
              <ModeSwitch mode={mode} onChange={setMode} label="Renting or buying" />
            </div>
            <div className="flex flex-wrap gap-[8px]">
              {who.map(([k, l]) => <button key={k} type="button" className={chipClass} onClick={() => startAs(mode, k)}>{l} →</button>)}
            </div>
          </div>
        </div>
      </div>
    </div>
    </Band>
  );
}
