import {useLayoutEffect, useRef, useState} from 'react';
import {articulate, parseAsk, STARTERS} from '../../concierge/engine';
import {AREAS, PERSONAS} from '../../concierge/data';
import {S, fresh, setS} from '../../concierge/store';
import {askGo} from '../../concierge/actions';
import {askBoxClass, askTextareaClass, useTypeahead} from '../Typeahead';
import {Chip, Cta, eyebrow} from '../ui';

type Idea = {s: string; full?: number};

/* what the parser understood so far, plus smart one-tap additions */
function readAsk(txt: string) {
  const keep = S; setS(fresh()); S.name = keep.name; const got = txt.trim() ? parseAsk(txt) : [];
  const heard = got.length ? articulate() : ''; const mode = S.mode, who = S.who; setS(keep);
  const t = txt.toLowerCase(), ideas: Idea[] = [];
  if (!t.trim()) STARTERS.slice(0, 4).forEach(s => ideas.push({s, full: 1}));
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

/* the free-text request: the page's main action */
export default function AskBox() {
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
    <div className={askBoxClass + ' shadow-[0_20px_60px_rgba(122,63,224,.18)]'}>
      <label htmlFor="askText" className={eyebrow}>Describe what you need</label>
      <textarea ref={taRef} id="askText" rows={2} autoComplete="off" spellCheck={false} aria-controls="suggest" className={askTextareaClass}
        placeholder="e.g. Couple, pool villa near the beach in Kata, 6 months"
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
      {ask.heard && <p className="mt-[6px] mx-0 mb-[8px] text-[13px] text-muted"><b className="text-ink">So:</b> {ask.heard}</p>}
      <div className="flex gap-[8px] items-center justify-between flex-wrap [border-top:1px_dashed_var(--color-line)] pt-[10px]">
        <div className="flex flex-wrap gap-[6px] text-[12px] text-muted items-center min-h-[26px]">
          {ask.got.length
            ? <><span>Understood:</span>{ask.got.map(g => <span key={g} className="py-[2px] px-[9px] rounded-full bg-[rgba(122,63,224,.2)] text-lilac font-semibold text-[12px]">{g}</span>)}</>
            : <span>Your words are fine. Press Enter when you’re done.</span>}
        </div>
        <Cta size="sm" onClick={() => askGo(taRef.current.value)}>Match me →</Cta>
      </div>
    </div>
    <div className="flex flex-wrap gap-[8px] mt-[12px]" aria-label={ask.got.length ? 'Add to your request' : 'Example requests'}>
      {ask.ideas.map(i => <Chip key={i.s} add={!i.full} onClick={() => addIdea(i)}>{i.s}</Chip>)}
    </div>
  </>;
}
