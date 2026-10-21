import {memo, useEffect, useLayoutEffect, useState} from 'react';
import mark from './assets/elevare-mark.png';
import {back, home, LABEL, quiz, moveInDate, money, budget, TIMELINES, whoLabel, vibeOf} from './concierge/engine';
import {TYPES} from './concierge/data';
import {S, cur, stageKey, takeScroll, useStore} from './concierge/store';
import {goTo, startQuiz} from './concierge/actions';
import LivePanel, {liveVisible} from './components/LivePanel';
import Stage from './components/Stage';
import Landing from './components/landing/Landing';
import {wrap} from './components/landing/parts';
import {Cta, cx} from './components/ui';

const NAV = [['services', 'Services'], ['journey', 'Concierge'], ['homes', 'Portfolio'], ['areas', 'Areas'], ['owners', 'Owners'], ['contact', 'Contact']];

const Brand = () => (
  <a className="flex items-center gap-[12px] no-underline text-inherit" href="#" id="home" aria-label="Elevare Property Partners, home"
    onClick={e => { e.preventDefault(); home(); }}>
    <img src={mark} alt="" className="w-[46px] h-auto block" />
    <span>
      <b className="block font-wordmark font-medium text-[20px] tracking-[.14em] leading-none">ELEVARE</b>
      <small className="flex items-center whitespace-nowrap gap-[6px] text-[8.5px] tracking-[.3em] text-muted mt-[5px] before:content-[''] before:w-[12px] before:h-px before:bg-faint after:content-[''] after:w-[12px] after:h-px after:bg-faint">PROPERTY PARTNERS</small>
    </span>
  </a>
);

/* homepage header: clear over the hero photo, solid once the page moves; a menu sheet on phones */
function SiteHeader() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 40);
    on(); window.addEventListener('scroll', on, {passive: true});
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={cx('fixed top-0 inset-x-0 z-40 [transition:background_.3s,border-color_.3s]',
      solid || open ? 'bg-[rgba(5,4,9,.88)] backdrop-blur-[12px] [border-bottom:1px_solid_var(--color-line)]' : 'bg-transparent [border-bottom:1px_solid_transparent]')}>
      <div className={cx(wrap, 'flex items-center justify-between gap-[16px] h-[72px]')}>
        <Brand />
        <nav aria-label="Sections" className="upto999:hidden flex gap-[26px] text-[13.5px]">
          {NAV.map(([id, l]) => <a key={id} href={'#' + id} className="text-[rgba(245,242,250,.82)] no-underline hover:text-white">{l}</a>)}
        </nav>
        <div className="flex items-center gap-[10px]">
          <Cta size="sm" className="whitespace-nowrap upto480:hidden" onClick={startQuiz}>Start your brief</Cta>
          <button type="button" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(o => !o)}
            className="from1000:hidden border border-line bg-transparent rounded-full h-[40px] px-[16px] text-[13.5px] cursor-pointer">{open ? 'Close' : 'Menu'}</button>
        </div>
      </div>
      <nav id="menu" aria-label="Sections" hidden={!open} className="from1000:hidden! [border-top:1px_solid_var(--color-line)]">
        <div className={cx(wrap, 'grid py-[10px]')}>
          {NAV.map(([id, l]) => <a key={id} href={'#' + id} onClick={() => setOpen(false)} className="text-ink no-underline text-[18px] font-display py-[10px] [border-bottom:1px_solid_var(--color-line)]">{l}</a>)}
          <Cta className="justify-center mt-[16px] mb-[8px]" onClick={() => { setOpen(false); startQuiz(); }}>Start your brief →</Cta>
        </div>
      </nav>
    </header>
  );
}

function Header() {
  return (
    <header className="flex items-center justify-between gap-[12px] pt-[18px] pb-[14px]">
      <Brand />
      <button type="button" hidden={cur === 'matching'} onClick={back}
        className="border border-line bg-transparent rounded-full py-[7px] px-[14px] text-[13px] cursor-pointer text-muted hover:text-ink hover:border-muted">
        ← Back
      </button>
    </header>
  );
}

/* step label, counter and bar: only refreshed on a full render, like the original */
function computeProgress() {
  if (cur === 'welcome') return null;
  const q = quiz(), qi = q.indexOf(cur), si = (['match', 'book', 'send'] as string[]).indexOf(cur), total = q.length + 3;
  const pos = qi >= 0 ? qi + 1 : cur === 'matching' ? q.length : q.length + si + 1;
  let count = qi >= 0 ? (cur === 'confirm' ? 'Last check' : `Question ${qi + 1} of ${q.length - 1}`) : cur === 'matching' ? '' : `Step ${si + 1} of 3 to your viewing`;
  if (cur === 'match') count = 'Save, compare, then book';
  return {width: (100 * pos / total) + '%', label: cur === 'matching' ? 'Matching' : LABEL[cur], count};
}

function computeBrief(): [string, string][] {
  if (cur === 'welcome' || cur === 'matching') return [];
  const it: [string, string][] = [];
  if (S.done.has('mode') && S.mode) it.push(['mode', S.mode === 'rent' ? 'Rent' : 'Buy']);
  if (S.done.has('who') && S.who) it.push(['who', whoLabel()]);
  if (S.vibe && vibeOf()) it.push(['vibe', vibeOf()[1]]);
  if (S.done.has('area') && S.area) it.push(['area', S.area === 'any' ? 'Anywhere' : S.area]);
  if (S.done.has('property')) it.push(['property', `${S.beds} bed · ${S.type === 'any' ? 'any type' : TYPES[S.type]}`]);
  if (S.done.has('timing')) it.push(['timing', S.mode === 'buy' ? TIMELINES[S.timeline] : `${S.moveIn === 0 ? 'ASAP' : moveInDate().toLocaleDateString('en-GB', {month: 'short'})} · ${S.lease} mo`]);
  if (S.done.has('budget')) it.push(['budget', '≤ ' + money(budget()) + (S.mode === 'buy' ? '' : '/mo')]);
  if (S.done.has('must') && S.must.size) it.push(['must', `${S.must.size} must-have${S.must.size > 1 ? 's' : ''}`]);
  return it;
}

/* progress and answer chips only refresh on a full render (k = render counter), like the original */
const Progress = memo<{k: number}>(function Progress() {
  const progress = computeProgress();
  return (
    <div className="grid gap-[8px] pt-[4px] pb-[18px]" hidden={!progress}>
      <div className="flex justify-between text-[12px] text-muted"><span>{progress?.label}</span><span>{progress?.count}</span></div>
      <div className="h-[3px] bg-line rounded-[3px] overflow-hidden"><i className="block h-full bg-grad [transition:width_.45s_ease]" style={{width: progress?.width}} /></div>
    </div>
  );
});

const Brief = memo<{k: number}>(function Brief() {
  return (
    <nav className="flex gap-[6px] flex-wrap pb-[18px]" aria-label="Your answers so far">
      {computeBrief().map(([k, v]) => (
        <button key={k} type="button" title={`Change ${LABEL[k].toLowerCase()}`} onClick={() => goTo(k)}
          className="border border-line bg-surface rounded-full py-[4px] px-[10px] text-[12px] text-muted cursor-pointer hover:text-ink hover:border-violet">
          <b className="text-ink font-semibold">{v}</b>
        </button>
      ))}
    </nav>
  );
});

export default function App() {
  useStore();
  const key = stageKey;
  const hasLive = liveVisible();

  useLayoutEffect(() => { document.body.classList.toggle('has-live', hasLive); }, [hasLive]);
  useLayoutEffect(() => { document.body.classList.toggle('is-landing', cur === 'welcome'); });
  useLayoutEffect(() => {
    const s = takeScroll();
    if (s) { try { window.scrollTo({top: s.top, behavior: s.smooth ? 'smooth' : 'auto'}); } catch { /* ignore */ } }
  });

  if (cur === 'welcome') return <>
    <SiteHeader />
    <main className="relative z-[1]"><Landing /></main>
  </>;

  return (
    <div className={cx('max-w-[760px] mx-auto relative z-[1]', hasLive && 'from1000:max-w-[1120px]')}>
      <Header />
      <div className={cx('grid gap-[28px] items-start', hasLive && 'from1000:grid-cols-[minmax(0,1fr)_300px]')}>
        <div className="min-w-0">
          <Progress k={key} />
          <Brief key={key} k={key} />
          <main aria-live="polite"><Stage key={key} /></main>
        </div>
        <LivePanel />
      </div>
    </div>
  );
}
