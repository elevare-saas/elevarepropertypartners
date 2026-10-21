import {useEffect, useRef, useState, type ReactNode} from 'react';
import mark from '../../assets/elevare-mark.png';
import {TYPES} from '../../concierge/data';
import {reduced, thb} from '../../concierge/engine';
import {DEMO_ASK, JOURNEY} from '../../concierge/content';
import {journeyDemo} from '../../concierge/journey';
import {Art, cx, eyebrow} from '../ui';
import {Section} from './parts';

type Demo = ReturnType<typeof journeyDemo>;

/* ---------- the phone and its screens ---------- */
function Phone({children, className}: {children: ReactNode; className?: string}) {
  return (
    <div className={cx('relative w-[300px] max-w-full h-[600px] rounded-[46px] bg-[#0b0910] p-[12px] mx-auto',
      'shadow-[0_0_0_1px_var(--color-line),0_0_0_9px_#15121c,0_50px_120px_rgba(122,63,224,.35)]', className)}>
      <span aria-hidden="true" className="absolute z-10 top-[20px] left-1/2 -translate-x-1/2 w-[84px] h-[22px] rounded-full bg-black" />
      <div className="relative h-full rounded-[36px] bg-bg overflow-hidden">{children}</div>
    </div>
  );
}

function AppBar({title = 'Concierge'}: {title?: string}) {
  return (
    <div className="flex items-center gap-[8px] pt-[50px] px-[16px] pb-[10px] [border-bottom:1px_solid_var(--color-line)]">
      <img src={mark} alt="" className="w-[22px]" />
      <b className="font-wordmark font-medium text-[11px] tracking-[.16em]">ELEVARE</b>
      <span className="ml-auto text-[10.5px] text-muted">{title}</span>
    </div>
  );
}

function Typed({text, run}: {text: string; run: boolean}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run || reduced()) return;
    let i = 0; const t = setInterval(() => { i += 1; setN(i); if (i >= text.length) clearInterval(t); }, 32);
    return () => clearInterval(t);
  }, [run, text]);
  const shown = run && !reduced() ? n : text.length;
  return <>{text.slice(0, shown)}{shown < text.length && <i className="inline-block w-[2px] h-[1em] align-[-2px] bg-pink ml-[1px]" />}</>;
}

const bubble = 'm-0 bg-surface border border-line rounded-[4px_14px_14px_14px] py-[8px] px-[11px] text-[12px]';
const tag = 'py-[2px] px-[8px] rounded-full bg-[rgba(122,63,224,.22)] text-lilac font-semibold text-[10.5px]';

function TellScreen({d, on}: {d: Demo; on: boolean}) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => setDone(true), reduced() ? 0 : DEMO_ASK.length * 32 + 250);
    return () => { clearTimeout(t); setDone(false); };
  }, [on]);
  return <>
    <AppBar />
    <div className="p-[14px] grid gap-[12px]">
      <p className={bubble}>Hi, I’m your Elevare concierge. Tell me what you need, in your own words.</p>
      <div className="bg-surface border border-line rounded-[14px] p-[12px] grid gap-[8px]">
        <span className="text-[9.5px] tracking-[.18em] uppercase text-muted font-semibold">Describe what you need</span>
        <p className="m-0 text-[14px] leading-[1.45] min-h-[62px]"><Typed text={DEMO_ASK} run={on} /></p>
        <div className={cx('flex flex-wrap gap-[5px] [border-top:1px_dashed_var(--color-line)] pt-[8px] [transition:opacity_.4s]', done ? 'opacity-100' : 'opacity-0')}>
          {d.got.map(g => <span key={g} className={tag}>{g}</span>)}
        </div>
      </div>
      <span className={cx('justify-self-end rounded-full bg-grad text-white text-[12px] font-bold py-[8px] px-[16px] [transition:opacity_.4s]', done ? 'opacity-100' : 'opacity-40')}>Match me →</span>
    </div>
  </>;
}

function BriefScreen({d}: {d: Demo}) {
  return <>
    <AppBar title="Your brief" />
    <div className="p-[14px] grid gap-[12px]">
      <p className={bubble}>Here’s what I heard. Check it’s right, or tap a suggestion.</p>
      <div className="grad-border-surface border rounded-[14px] p-[14px]">
        <p className="m-0 font-display text-[17px] leading-[1.3]">{d.heard}</p>
      </div>
      {d.refs.length > 0 && <>
        <span className="text-[9.5px] tracking-[.18em] uppercase text-muted font-semibold">Suggestions</span>
        {d.refs.slice(0, 2).map(r => <span key={r} className="bg-surface border border-line rounded-[12px] py-[9px] px-[12px] text-[12.5px] font-semibold">+ {r}</span>)}
      </>}
    </div>
  </>;
}

function MatchingScreen({d, on}: {d: Demo; on: boolean}) {
  const max = d.funnel[0][1];
  const last = d.funnel[d.funnel.length - 1][1];
  return <>
    <AppBar title="Live matches" />
    <div className="p-[14px] grid gap-[14px]">
      <div className="bg-surface border border-line rounded-[14px] p-[14px]">
        <span className="text-[9.5px] tracking-[.18em] uppercase text-muted font-semibold">Live matches</span>
        <div className="text-[12px] text-muted mt-[2px]"><b className="font-display font-medium text-[40px] text-ink mr-[4px]">{last}</b>of {max} rentals fit</div>
      </div>
      <ol className="list-none m-0 p-0 grid gap-[12px]">
        {d.funnel.map(([l, n], i) => (
          <li key={l} className="grid gap-[5px] text-[12px]">
            <span className="flex justify-between"><span className={i === d.funnel.length - 1 ? 'font-bold' : 'text-muted'}>{l}</span><span className="font-mono">{n}</span></span>
            <span className="block h-[8px] rounded-[4px] bg-line overflow-hidden">
              <i className="block h-full rounded-[4px] bg-grad [transition:width_.9s_cubic-bezier(.2,.7,.2,1)]"
                style={{width: on ? `${Math.max(4, 100 * n / max)}%` : '100%', transitionDelay: `${i * 220}ms`}} />
            </span>
          </li>
        ))}
      </ol>
      <p className="m-0 text-[11.5px] leading-[1.45] bg-[rgba(122,63,224,.16)] border border-[rgba(122,63,224,.35)] rounded-[10px] py-[8px] px-[10px]">
        {last === 1 ? '1 home ticks' : last + ' homes tick'} every box. Each answer sharpens the list.
      </p>
    </div>
  </>;
}

function PricedScreen({d, on}: {d: Demo; on: boolean}) {
  const p = d.best, c = d.c;
  return <>
    <AppBar title="Your match" />
    <div className="aspect-[16/9] relative">
      <Art p={p} k="j" />
      <span className="absolute top-[10px] left-[10px] bg-[rgba(5,4,9,.75)] text-white rounded-full py-[3px] px-[9px] text-[10.5px] font-bold">{d.score}% match</span>
    </div>
    <div className="p-[14px] grid gap-[10px]">
      <div className="flex justify-between items-end gap-[8px]">
        <div><b className="block font-display font-medium text-[20px] leading-[1.05]">{p.name}</b><small className="text-muted text-[10.5px]">{p.area} · {p.beds} bed {TYPES[p.type].toLowerCase()}</small></div>
        <span className="font-mono text-[14px] whitespace-nowrap">{thb(p.price)}</span>
      </div>
      {[['Typical in ' + p.area, c.m, false], ['This home', p.price, true]].map(([l, v, us]) => (
        <div key={String(l)} className="grid gap-[4px] text-[11px]">
          <span className="flex justify-between"><span className={us ? 'font-bold' : 'text-muted'}>{l}</span><span className="font-mono">{thb(v as number)}</span></span>
          <span className="block h-[8px] rounded-[4px] bg-line overflow-hidden">
            <i className={cx('block h-full rounded-[4px] [transition:width_1s_cubic-bezier(.2,.7,.2,1)]', us ? 'bg-grad' : 'bg-bar')}
              style={{width: on ? `${100 * (v as number) / c.m}%` : '0%', transitionDelay: us ? '350ms' : '0ms'}} />
          </span>
        </div>
      ))}
      <b className="text-good text-[13px]">{thb(c.diff)}/month below market ({c.pct}%)</b>
      <span className="text-[11.5px] text-muted">Over {d.lease} months you keep <b className="text-ink font-mono">{thb(c.lease)}</b>.</span>
    </div>
  </>;
}

function ViewScreen({d}: {d: Demo}) {
  return <>
    <div className="flex items-center gap-[10px] pt-[50px] px-[14px] pb-[10px] bg-[#0f2a1c]">
      <span className="w-[30px] h-[30px] rounded-full bg-surface-2 grid place-items-center"><img src={mark} alt="" className="w-[20px]" /></span>
      <span className="grid leading-[1.2]"><b className="text-[13px]">Elevare</b><small className="text-[10.5px] text-[#9fdcb7]">Your Elevare advisor</small></span>
    </div>
    <div className="p-[12px] h-[calc(100%-90px)] bg-[#0a1510] relative">
      <div className="ml-auto max-w-[92%] bg-[#134d32] rounded-[12px_4px_12px_12px] py-[9px] px-[11px] text-[11px] leading-[1.45] whitespace-pre-wrap max-h-[340px] overflow-hidden relative">
        {d.message}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[60px] bg-[linear-gradient(transparent,#134d32)]" />
      </div>
      <span className="absolute left-[12px] right-[12px] bottom-[14px] flex justify-center rounded-[12px] bg-wa text-wa-ink font-bold text-[13px] py-[11px]">Send on WhatsApp</span>
    </div>
  </>;
}

const SCREENS = [TellScreen, BriefScreen, MatchingScreen, PricedScreen, ViewScreen];

/* ---------- the story ---------- */
export default function Journey() {
  const [d] = useState(journeyDemo);
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) setActive(+(e.target as HTMLElement).dataset.i);
    }), {rootMargin: '-45% 0px -45% 0px'});
    steps.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <Section id="journey" kicker="The Elevare concierge" title="From a sentence to a viewing, in about a minute."
      sub="This is the journey every guest takes with us. Scroll through it with a real request, run through our real matching.">
      <div className="grid gap-[40px] from1000:grid-cols-[minmax(0,1fr)_380px] from1000:gap-[64px]">
        <ol className="list-none m-0 p-0">
          {JOURNEY.map(([k, t, body], i) => {
            const Screen = SCREENS[i], on = active === i;
            return (
              <li key={k} data-i={i} ref={el => { steps.current[i] = el; }}
                className="from1000:min-h-[76vh] from1000:flex from1000:flex-col from1000:justify-center py-[28px] upto999:[border-top:1px_solid_var(--color-line)]">
                <div className={cx('[transition:opacity_.4s] grid gap-[12px] max-w-[46ch]', on ? 'opacity-100' : 'from1000:opacity-35')}>
                  <span className="flex items-center gap-[12px]">
                    <span className={cx('font-mono text-[12px] w-[34px] h-[34px] rounded-full grid place-items-center border', on ? 'bg-grad border-transparent text-white' : 'border-line text-muted')}>0{i + 1}</span>
                    <span className={eyebrow}>{k}</span>
                  </span>
                  <h3 className="m-0 font-display font-medium text-[clamp(28px,3.6vw,40px)] leading-[1.08]">{t}</h3>
                  <p className="m-0 text-muted text-[15.5px]">{body}</p>
                </div>
                {/* phones and tablets: each step carries its own screen */}
                <div className="from1000:hidden mt-[22px]"><Phone><Screen d={d} on={on} /></Phone></div>
              </li>
            );
          })}
        </ol>
        <div className="upto999:hidden">
          <div className="sticky top-[12vh] h-[76vh] flex items-center">
            <Phone>
              {SCREENS.map((Screen, i) => (
                <div key={i} aria-hidden={active !== i} className={cx('absolute inset-0 [transition:opacity_.5s,transform_.5s]', active === i ? 'opacity-100' : 'opacity-0 [transform:translateY(12px)] pointer-events-none')}>
                  <Screen d={d} on={active === i} />
                </div>
              ))}
            </Phone>
            {/* step dots */}
            <ol className="list-none m-0 p-0 grid gap-[8px] ml-[18px]" aria-hidden="true">
              {JOURNEY.map((_, i) => <li key={i} className={cx('w-[6px] rounded-full [transition:height_.3s,background_.3s]', active === i ? 'h-[26px] bg-grad' : 'h-[6px] bg-line')} />)}
            </ol>
          </div>
        </div>
      </div>
    </Section>
  );
}
