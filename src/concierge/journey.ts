/* Runs the real concierge on the demo request, then restores the visitor's own state */
import {LISTINGS} from './data';
import {articulate, buildMessage, calc, parseAsk, pool, ranked, reasons, refCode, refinements} from './engine';
import {S, fresh, setS} from './store';
import {DEMO_ASK} from './content';

export function journeyDemo() {
  const keep = S; setS(fresh());
  const got = parseAsk(DEMO_ASK);
  ['mode', 'who', 'vibe', 'area', 'property', 'timing', 'budget', 'must'].forEach(k => S.done.add(k));
  const heard = articulate(), refs = refinements().map(r => r.label);
  const rentals = LISTINGS.filter(p => p.mode === 'rent'), inArea = rentals.filter(p => p.area === S.area);
  const funnel: [string, number][] = [
    ['Rentals on our books', rentals.length],
    [`In ${S.area}`, inArea.length],
    [`Pool villas, ${S.beds}+ bedrooms`, inArea.filter(p => p.type === S.type && p.beds >= S.beds).length],
    ['Within your budget', pool().length]
  ];
  const fits = new Set(pool().map(p => p.id));
  const best = ranked().find(x => fits.has(x.p.id)) || ranked()[0];
  S.pick = best.p.id; S.day = 2;
  const out = {got, heard, refs, funnel, best: best.p, score: best.s, c: calc(best.p), why: reasons(best.p).r.slice(0, 3),
    lease: S.lease, message: buildMessage(), ref: refCode()};
  setS(keep);
  return out;
}
