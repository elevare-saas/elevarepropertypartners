import {memo, useLayoutEffect} from 'react';
import mark from './assets/elevare-mark.png';
import {back, home, LABEL, quiz, moveInDate, money, budget, TIMELINES, whoLabel, vibeOf} from './concierge/engine';
import {TYPES} from './concierge/data';
import {S, cur, stageKey, takeScroll, useStore} from './concierge/store';
import {goTo} from './concierge/actions';
import LivePanel, {liveVisible} from './components/LivePanel';
import Stage from './components/Stage';
import {cx} from './components/ui';

function Header() {
  return (
    <header className="flex items-center justify-between gap-[12px] pt-[18px] pb-[14px]">
      <a className="flex items-center gap-[12px] no-underline text-inherit" href="#" id="home" aria-label="Elevare Property Partners, start over"
        onClick={e => { e.preventDefault(); home(); }}>
        <img src={mark} alt="" className="w-[46px] h-auto block" />
        <span>
          <b className="block font-wordmark font-medium text-[20px] tracking-[.14em] leading-none">ELEVARE</b>
          <small className="flex items-center gap-[6px] text-[8.5px] tracking-[.3em] text-muted mt-[5px] before:content-[''] before:w-[12px] before:h-px before:bg-faint after:content-[''] after:w-[12px] after:h-px after:bg-faint">PROPERTY PARTNERS</small>
        </span>
      </a>
      <button type="button" hidden={cur === 'welcome' || cur === 'matching'} onClick={back}
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
  useLayoutEffect(() => {
    const s = takeScroll();
    if (s) { try { window.scrollTo({top: s.top, behavior: s.smooth ? 'smooth' : 'auto'}); } catch { /* ignore */ } }
  });

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
