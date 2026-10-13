import {useRef} from 'react';
import {AMEN, AREAS, BUYERS, PERSONAS, TYPES} from '../concierge/data';
import {articulate, budget, monthsAhead, money, P, pool, quiz, recArea, refinements, TIMELINES} from '../concierge/engine';
import {S, update} from '../concierge/store';
import {
  chooseArea, chooseMode, chooseVibe, chooseWho, goTo, next, refine, setBudgetTier, setLease, setMoveIn,
  setOwn, setTimeline, setType, skip, slideBudget, stepBeds, toggleMust
} from '../concierge/actions';
import {askBoxClass, askTextareaClass, useTypeahead} from './Typeahead';
import {Actions, Box, Chip, Chips, Cnt, Cta, cx, eyebrow, Eyebrow, fieldLabel, Ghost, hint, Next, Opt, Opts, Pair, Question, Say, Screen, Skip} from './ui';

export function Mode() {
  return (
    <Screen>
      <Say step="mode" />
      <Question title="Are you looking to rent or buy?" sub="Rentals run from 1 month to multi-year leases." />
      <Opts>
        <Opt pressed={S.mode === 'rent'} title="Rent" desc="Monthly, 3, 6, 12 or 24-month stays" onClick={() => chooseMode('rent')} />
        <Opt pressed={S.mode === 'buy'} title="Buy" desc="Villas, condos and townhouses, freehold or leasehold" onClick={() => chooseMode('buy')} />
      </Opts>
    </Screen>
  );
}

export function Who() {
  if (S.mode === 'buy') return (
    <Screen>
      <Say step="who" />
      <Question title="What’s it for?" sub="This helps us suggest the right area and property." />
      <Opts>{BUYERS.map(b => <Opt key={b.k} pressed={S.who === b.k} title={b.l} desc={b.d} onClick={() => chooseWho(b.k)} />)}</Opts>
    </Screen>
  );
  return (
    <Screen>
      <Say step="who" />
      <Question title="Which sounds most like you?" sub="Pick the closest. You can fine-tune everything later." />
      <Opts>{Object.entries(PERSONAS).map(([k, p]) => <Opt key={k} pressed={S.who === k} title={p.l} desc={p.d} onClick={() => chooseWho(k)} />)}</Opts>
    </Screen>
  );
}

export function Vibe() {
  const p = P(); if (!p) return <Who />;
  return (
    <Screen>
      <Say step="vibe" />
      <Question title={p.q} sub="This steers the area and the must-haves I suggest." />
      <Opts>
        {p.vibes.map(v => <Opt key={v[0]} pressed={S.vibe === v[0]} title={v[1]}
          desc={v[2].length ? 'Adds: ' + v[2].map(k => AMEN[k].toLowerCase()).join(', ') : `Best area: ${v[3]}`}
          onClick={() => chooseVibe(v[0])} />)}
      </Opts>
    </Screen>
  );
}

export function Area() {
  const rec = recArea();
  const sorted = [...AREAS].sort((a, b) => ((+(b.k === rec)) - (+(a.k === rec))) || (pool({area: b.k}).length - pool({area: a.k}).length));
  return (
    <Screen>
      <Say step="area" />
      <Question title="Which part of Phuket?" sub="Tap one. Not sure? Let us pick." />
      <Opts>
        {sorted.map(a => (
          <Opt key={a.k} pressed={S.area === a.k} desc={a.d} count={pool({area: a.k}).length} onClick={() => chooseArea(a.k)}
            title={<>{a.k}{a.k === rec && <> <span className="text-[11px] font-bold text-muted">· SUGGESTED FOR YOU</span></>}</>} />
        ))}
        <Opt wide pressed={S.area === 'any'} title="Not sure yet" desc="Show me the best match anywhere on the island" onClick={() => chooseArea('any')} />
      </Opts>
      <Actions><Skip onClick={skip} /><span /></Actions>
    </Screen>
  );
}

const stepBtn = 'w-[42px] h-[42px] rounded-full border border-line bg-surface-2 text-[20px] cursor-pointer';

export function Property() {
  const fit = pool({type: S.type, beds: S.beds}).length;
  return (
    <Screen>
      <Say step="property" />
      <Question title="What kind of place?" sub="Choose a type and how many bedrooms you need." />
      <Chips>
        {[...Object.entries(TYPES), ['any', 'Open to any']].map(([k, l]) => (
          <Chip key={k} pressed={S.type === k} onClick={() => setType(k)}>{l} <Cnt>{pool({type: k, beds: S.beds}).length}</Cnt></Chip>
        ))}
      </Chips>
      <Pair className="mt-[12px]">
        <Box>
          <span className={fieldLabel}>Bedrooms</span>
          <div className="flex items-center justify-between">
            <button type="button" className={stepBtn} aria-label="Fewer bedrooms" onClick={() => stepBeds(-1)}>−</button>
            <output className="font-display text-[38px] leading-none">{S.beds}</output>
            <button type="button" className={stepBtn} aria-label="More bedrooms" onClick={() => stepBeds(1)}>+</button>
          </div>
          <span className={hint}>{fit} {S.type === 'any' ? 'homes' : TYPES[S.type].toLowerCase() + 's'} with {S.beds}+ bedrooms fit so far</span>
        </Box>
        {S.mode === 'buy' && (
          <Box>
            <span className={fieldLabel}>Ownership</span>
            <Chips>
              <Chip pressed={S.own === 'any'} onClick={() => setOwn('any')}>Either</Chip>
              <Chip pressed={S.own === 'freehold'} onClick={() => setOwn('freehold')}>Foreign freehold</Chip>
              <Chip pressed={S.own === 'leasehold'} onClick={() => setOwn('leasehold')}>Leasehold is fine</Chip>
            </Chips>
            <span className={hint}>Foreigners can own condos freehold; villas are usually leasehold.</span>
          </Box>
        )}
      </Pair>
      <Next onNext={next} onSkip={skip} />
    </Screen>
  );
}

export function Timing() {
  if (S.mode === 'buy') {
    const desc: Record<string, string> = {now: 'Funds ready, want to move quickly', '3m': 'Actively viewing properties', '6m': 'Planning ahead', research: 'Comparing options for now'};
    return (
      <Screen>
        <Say step="timing" />
        <Question title="What’s your timeline?" sub="No pressure. It helps us prioritise viewings." />
        <Opts>{Object.entries(TIMELINES).map(([k, l]) => <Opt key={k} pressed={S.timeline === k} title={l} desc={desc[k]} onClick={() => setTimeline(k)} />)}</Opts>
      </Screen>
    );
  }
  return (
    <Screen>
      <Say step="timing" />
      <Question title="When do you want the keys?" sub="We confirm exact availability on WhatsApp." />
      <Pair>
        <Box>
          <span className={fieldLabel}>Move-in</span>
          <Chips>
            {[0, 1, 2, 3, 4, 5].map(k => (
              <Chip key={k} pressed={S.moveIn === k} onClick={() => setMoveIn(k)}>
                {k === 0 ? 'ASAP' : monthsAhead(k).toLocaleDateString('en-GB', {month: 'short', year: '2-digit'})}
              </Chip>
            ))}
          </Chips>
        </Box>
        <Box>
          <span className={fieldLabel}>How long?</span>
          <Chips>{[1, 3, 6, 12, 24].map(k => <Chip key={k} pressed={S.lease === k} onClick={() => setLease(k)}>{k === 1 ? '1 month' : k + ' months'}</Chip>)}</Chips>
          <span className={hint}>Longer stays usually get better monthly rates.</span>
        </Box>
      </Pair>
      <Next onNext={next} onSkip={skip} />
    </Screen>
  );
}

export function Budget() {
  const rent = S.mode !== 'buy';
  const tiers: [number, string, string][] = rent
    ? [[20000, 'Up to ฿20k / month', 'Studios and 1-bed condos'], [40000, '฿20k – 40k / month', 'Larger condos, townhouses'], [80000, '฿40k – 80k / month', 'Pool villas'], [150000, '฿80k+ / month', 'Large and sea-view villas']]
    : [[8000000, 'Up to ฿8M', 'Condos and townhouses'], [15000000, '฿8M – 15M', 'Pool villas, larger condos'], [30000000, '฿15M – 30M', 'Sea-view and family villas'], [60000000, '฿30M+', 'Prestige estates']];
  const [min, max, step] = rent ? [8000, 300000, 1000] : [3000000, 80000000, 500000];
  return (
    <Screen>
      <Say step="budget" />
      <Question title={rent ? 'Monthly budget?' : 'Purchase budget?'}
        sub={S.who && rent ? `We’ve pre-set a typical ${PERSONAS[S.who].l.toLowerCase()} budget. Adjust freely.` : 'We’ll show you how your match compares with the market either way.'} />
      <Opts>{tiers.map(([v, l, d]) => <Opt key={v} pressed={budget() === v} title={l} desc={d} count={pool({b: v}).length} onClick={() => setBudgetTier(v)} />)}</Opts>
      <Box className="mt-[12px]">
        <label htmlFor="budget" className={fieldLabel}>Or set it exactly</label>
        <div className="font-display text-[28px] leading-none tabular-nums">{money(budget())}{rent ? ' / month' : ''}</div>
        <span className={hint}>{pool({b: budget()}).length} homes fit at this budget</span>
        <input type="range" id="budget" min={min} max={max} step={step} defaultValue={budget()} onChange={e => slideBudget(+e.target.value)} />
      </Box>
      <Next onNext={next} onSkip={skip} />
    </Screen>
  );
}

export function Must() {
  const order = P()?.show || Object.keys(AMEN), rest = Object.keys(AMEN).filter(k => !order.includes(k)), now = pool();
  return (
    <Screen>
      <Say step="must" />
      <Question title="Your must-haves" sub="The most relevant ones for you are first." />
      {P() && <p className={cx(hint, 'mt-[-10px] mx-0 mb-[12px]')}>Numbers show how many of your {now.length} current matches have each one.</p>}
      <Chips>
        {order.map(k => <Chip key={k} pressed={S.must.has(k)} onClick={() => toggleMust(k)}>{AMEN[k]} <Cnt>{now.filter(p => p.am.includes(k)).length}</Cnt></Chip>)}
      </Chips>
      <details className="mt-[12px]">
        <summary className={cx(hint, 'cursor-pointer')}>More options</summary>
        <Chips className="mt-[10px]">{rest.map(k => <Chip key={k} pressed={S.must.has(k)} onClick={() => toggleMust(k)}>{AMEN[k]}</Chip>)}</Chips>
      </details>
      <Next label="Review my brief" onNext={next} onSkip={skip} />
    </Screen>
  );
}

export function Confirm() {
  const refs = refinements();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const setNote = () => { S.note = noteRef.current.value.trim().slice(0, 300); update(); };
  const ta = useTypeahead(noteRef, setNote);
  return (
    <Screen>
      <Say step="confirm" />
      <Question title="Did I get that right?" />
      <Box className="grad-border-surface!">
        <p id="playback" className="m-0 font-display text-[22px] leading-[1.3]">{articulate()}</p>
      </Box>
      {refs.length > 0 && <>
        <Eyebrow className="mt-[18px]">Suggestions to sharpen your search</Eyebrow>
        <Opts className="mt-[8px]">{refs.map(r => <Opt key={r.id} title={`+ ${r.label}`} desc={r.why} onClick={() => refine(r.id)} />)}</Opts>
      </>}
      <div className={cx(askBoxClass, 'mt-[14px]')}>
        <label htmlFor="noteIn" className={eyebrow}>Anything else we should know?</label>
        <textarea ref={noteRef} id="noteIn" rows={2} className={askTextareaClass} defaultValue={S.note}
          placeholder="e.g. we have a small dog, need parking for two cars"
          onInput={() => { setNote(); ta.show(); }}
          onKeyDown={ta.onKeyDown} onBlur={ta.onBlur} />
        {ta.list}
      </div>
      <Actions>
        <Ghost onClick={() => goTo(quiz()[1])}>Change my answers</Ghost>
        <Cta onClick={next}>Yes, find my match →</Cta>
      </Actions>
    </Screen>
  );
}
