import {useLayoutEffect, useRef, useState} from 'react';
import mark from '../assets/elevare-mark.png';
import {articulate, parseAsk, STARTERS} from '../concierge/engine';
import {AREAS, PERSONAS} from '../concierge/data';
import {S, fresh, setS} from '../concierge/store';
import {askGo, browse, chooseMode, setName} from '../concierge/actions';
import {askBoxClass, askTextareaClass, useTypeahead} from './Typeahead';
import {Box, Chip, Cta, Eyebrow, eyebrow, fieldLabel, Ghost} from './ui';

type Idea = {s: string; full?: number};

/* what the parser understood so far, plus smart one-tap additions */
function readAsk(txt: string) {
  const keep = S; setS(fresh()); S.name = keep.name; const got = txt.trim() ? parseAsk(txt) : [];
  const heard = got.length ? articulate() : ''; const mode = S.mode, who = S.who; setS(keep);
  const t = txt.toLowerCase(), ideas: Idea[] = [];
  if (!t.trim()) STARTERS.forEach(s => ideas.push({s, full: 1}));
  else {
    if (mode === 'rent' && !who) ideas.push({s: 'digital nomad'}, {s: 'couple'}, {s: 'on my own'}, {s: 'for business'});
    if (who === 'nomad' && !/wifi|fibre|internet/.test(t)) ideas.push({s: 'fast wifi'});
    if (who === 'nomad' && !/cowork/.test(t)) ideas.push({s: 'near coworking'});
    if (who === 'business' && !/invoice|company lease/.test(t)) ideas.push({s: 'company lease with tax invoice'});
    if (who === 'family' && !/school/.test(t)) ideas.push({s: 'near schools'});
    if (who === 'couple' && !/pool/.test(t)) ideas.push({s: 'private pool'});
    if (!AREAS.some(a => t.includes(a.k.toLowerCase()))) ideas.push({s: 'in ' + (who && PERSONAS[who] ? PERSONAS[who].area : 'Rawai')});
    if (!/bed|studio/.test(t)) ideas.push({s: who === 'family' ? '3 bedrooms' : '1 bedroom'});
    if (mode !== 'buy' && !/month|year/.test(t)) ideas.push({s: who === 'nomad' ? '3 months' : '12 months'});
    if (!/(under|budget|฿|\$|\dm\b|million|\dk)/.test(t)) ideas.push({s: mode === 'buy' ? 'under 20m' : who === 'solo' || who === 'nomad' ? 'under 25k a month' : 'under 80k a month'});
  }
  return {got, heard, ideas: ideas.slice(0, 6)};
}

export default function Welcome() {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [ask, setAsk] = useState(() => readAsk(''));
  const askUpdate = () => setAsk(readAsk(taRef.current?.value ?? ''));
  const ta = useTypeahead(taRef, askUpdate);

  useLayoutEffect(() => {
    try { const d = localStorage.getItem('elevare_ask3'); if (d && !taRef.current.value) taRef.current.value = d; } catch { /* ignore */ }
    setAsk(readAsk(taRef.current.value));
  }, []);

  const addIdea = (i: Idea) => {
    const el = taRef.current;
    el.value = i.full ? i.s : (el.value.trim().replace(/[.,]$/, '') + ', ' + i.s).replace(/^, /, '');
    askUpdate(); el.focus(); el.setSelectionRange(el.value.length, el.value.length);
  };

  return <>
    <section className="animate-rise pt-[18px] pb-[8px] grid gap-[16px]">
      <img className="w-[120px] max-w-full" src={mark} alt="Elevare Property Partners" />
      <Eyebrow>Phuket property concierge · Rentals &amp; sales</Eyebrow>
      <h1 className="text-[clamp(38px,8vw,64px)]">Find your place in Phuket, <span className="grad-text">matched in 60 seconds.</span></h1>
      <p className="m-0 text-muted text-[16px] max-w-[52ch]">Nomad, couple, solo, family, business or buying: answer a few quick taps and we’ll match you, compare the price with the market, and write your WhatsApp message.</p>
      <Box className="max-w-[360px]">
        <label htmlFor="nameIn" className={fieldLabel}>First, what should we call you? (optional)</label>
        <input type="text" id="nameIn" defaultValue={S.name} autoComplete="given-name" placeholder="Your first name"
          onChange={e => { setName(e.target.value); askUpdate(); }} />
      </Box>
      <div className="flex gap-[10px] flex-wrap">
        <Cta onClick={() => chooseMode('rent')}>I want to rent →</Cta>
        <Cta secondary onClick={() => chooseMode('buy')}>I want to buy →</Cta>
      </div>
      <Ghost className="justify-self-start" onClick={() => browse('rent')}>Just browse every rental</Ghost>
    </section>

    <div className="flex items-center gap-[12px] text-faint text-[12px] tracking-[.2em] uppercase mt-[26px] mb-[14px] before:content-[''] before:flex-1 before:h-px before:bg-line after:content-[''] after:flex-1 after:h-px after:bg-line">or just tell us</div>

    <div className={askBoxClass}>
      <label htmlFor="askText" className={eyebrow}>Describe what you need</label>
      <textarea ref={taRef} id="askText" rows={2} autoComplete="off" spellCheck={false} aria-controls="suggest" className={askTextareaClass}
        placeholder="e.g. Digital nomad, 1 bed near coworking in Rawai, 3 months"
        onInput={() => {
          clearTimeout(timer.current); timer.current = setTimeout(askUpdate, 160);
          try { localStorage.setItem('elevare_ask3', taRef.current.value); } catch { /* ignore */ }
          ta.show();
        }}
        onKeyDown={e => {
          if (ta.onKeyDown(e)) return;
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askGo(taRef.current.value); }
        }}
        onBlur={ta.onBlur}
      />
      {ta.list}
      <p className="mt-[6px] mx-0 mb-[8px] text-[13px] text-muted">
        {ask.heard && <><b className="text-ink">So:</b> {ask.heard}</>}
      </p>
      <div className="flex gap-[8px] items-center justify-between flex-wrap [border-top:1px_dashed_var(--color-line)] pt-[8px]">
        <div className="flex flex-wrap gap-[6px] text-[12px] text-muted items-center">
          {ask.got.length
            ? <><span>Understood:</span>{ask.got.map(g => <span key={g} className="py-[2px] px-[9px] rounded-full bg-[rgba(122,63,224,.2)] text-lilac font-semibold text-[12px]">{g}</span>)}</>
            : <span>Type, or tap an example below</span>}
        </div>
        <Cta size="sm" onClick={() => askGo(taRef.current.value)}>Match me →</Cta>
      </div>
    </div>

    <div id="ideas" className="flex flex-wrap gap-[8px] mt-[12px]">
      {ask.ideas.map(i => <Chip key={i.s} add={!i.full} onClick={() => addIdea(i)}>{i.s}</Chip>)}
    </div>

    <div className="grid grid-cols-[repeat(3,1fr)] gap-[10px] mt-[28px] upto560:grid-cols-[1fr]">
      {[
        ['Priced against the market', 'See how each home compares with similar local listings.'],
        ['See it first', 'In-person or live video viewing, arranged on WhatsApp.'],
        ['One local contact', 'The same Elevare advisor from first message to keys.']
      ].map(([b, t]) => (
        <div key={b} className="[border-top:1px_solid_var(--color-line)] pt-[10px] text-[12.5px] text-muted">
          <b className="block text-ink text-[13.5px]">{b}</b>{t}
        </div>
      ))}
    </div>
  </>;
}
