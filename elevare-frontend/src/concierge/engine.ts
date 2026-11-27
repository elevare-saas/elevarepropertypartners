/* ported from src/demo/demo.html */
import {
  AMEN,
  AREAS,
  BUY_REC,
  BUYERS,
  CONFIG,
  LISTINGS,
  PERSONAS,
  RENT_BASE,
  SQM_BASE,
  TYPE_RENT,
  TYPES,
  type Listing
} from './data';
import {S, cur, setCur, setTrail, trail, render, requestScroll, type Step} from './store';

/* ============ STATE HELPERS ============ */
export const today = new Date();
today.setHours(0, 0, 0, 0);
const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const monthsAhead = (k: number) => new Date(today.getFullYear(), today.getMonth() + k, 1);
export const LABEL: Record<string, string> = {
  mode: 'Rent or buy',
  who: 'About you',
  vibe: 'Your style',
  area: 'Location',
  property: 'Property',
  timing: 'Timing',
  budget: 'Budget',
  must: 'Must-haves',
  confirm: 'Your brief',
  match: 'Your matches',
  book: 'Viewing',
  send: 'Send'
};
export const quiz = (): Step[] =>
  S.mode === 'buy'
    ? ['mode', 'who', 'area', 'property', 'timing', 'budget', 'must', 'confirm']
    : ['mode', 'who', 'vibe', 'area', 'property', 'timing', 'budget', 'must', 'confirm'];
const flow = (): Step[] => ['welcome', ...quiz(), 'matching', 'match', 'book', 'send'];

export const thb = (v: number) => '฿' + (Math.round(v / 100) * 100).toLocaleString('en-US');
export const big = (v: number) =>
  v >= 1e6 ? '฿' + (v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M' : thb(v);
export const money = (v: number) => (S.mode === 'buy' ? big(v) : thb(v));
const areaOf = (k: string) => AREAS.find(a => a.k === k);
export const P = () => (S.mode === 'rent' && S.who ? PERSONAS[S.who] : null);
export const vibeOf = () => P() && P()!.vibes.find(v => v[0] === S.vibe);
export const whoLabel = () => (S.mode === 'buy' ? BUYERS.find(b => b.k === S.who)?.l || '' : PERSONAS[S.who!]?.l || '');
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"]/g,
    c => (({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}) as Record<string, string>)[c]
  );
export const TIMELINES: Record<string, string> = {
  now: 'Ready to buy now',
  ['3m']: 'Within 3 months',
  ['6m']: 'Within 6 months',
  research: 'Just researching'
};
export const moveInDate = () => monthsAhead(S.moveIn);
const monthName = (d: Date) => d.toLocaleDateString('en-GB', {month: 'long', year: 'numeric'});
export const budget = () => S.budget[S.mode || 'rent'];
const hi = () => (S.name ? `${esc(S.name)}, ` : '');
const listify = (a: string[]) => (a.length < 2 ? a[0] || '' : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
export const recArea = () => (S.mode === 'buy' ? BUY_REC[S.who as keyof typeof BUY_REC] : vibeOf()?.[3] || P()?.area);

/* ============ MARKET + MATCHING ============ */
/* indicative market figure: monthly rent (rent) or sale price (buy) */
/* rent: by bedrooms; sale: by m², so a home for sale without a floor area has no market figure (null) */
function marketFor(mode: Listing['mode'], area: string, type: Listing['type'], beds: number, sqm?: number) {
  const f = areaOf(area)?.f ?? 1;
  if (mode === 'rent') return RENT_BASE[Math.min(6, Math.max(1, beds)) as keyof typeof RENT_BASE] * TYPE_RENT[type] * f;
  return sqm ? SQM_BASE[type] * f * sqm : null;
}
export const market = (p: Listing) => marketFor(p.mode, p.area, p.type, p.beds, p.sqm);
export interface Calc {
  /* false when there's no market figure (a home for sale without a floor area): show no comparison */
  known: boolean;
  m: number;
  diff: number;
  pct: number;
  lease?: number;
  /* only when an estimated rent was entered */
  yield?: number;
  sqmP?: number;
  sqmM?: number;
}
export function calc(p: Listing): Calc {
  const m = market(p);
  if (p.mode === 'rent') {
    const diff = m! - p.price;
    return {known: true, m: m!, diff, pct: Math.round((100 * diff) / m!), lease: diff * S.lease};
  }
  const yieldOf = p.rent ? (p.rent * 12) / p.price : undefined;
  /* unknown market: neither "below" nor "above", so every comparison stays quiet */
  if (m === null) return {known: false, m: p.price, diff: 0, pct: 0, yield: yieldOf};
  return {
    known: true,
    m,
    diff: m - p.price,
    pct: Math.round((100 * (m - p.price)) / m),
    yield: yieldOf,
    sqmP: p.price / p.sqm!,
    sqmM: m / p.sqm!
  };
}
export function score(p: Listing) {
  let s = 0,
    max = 0;
  max += 30;
  if (!S.area || S.area === 'any') s += 22;
  else if (p.area === S.area) s += 30;
  else s += 6;
  max += 15;
  if (S.type === 'any' || p.type === S.type) s += 15;
  max += 20;
  if (p.beds === S.beds) s += 20;
  else if (p.beds === S.beds + 1) s += 12;
  else if (p.beds > S.beds) s += 4;
  else s -= 25;
  max += 20;
  const b = budget();
  if (p.price <= b) s += 20;
  else if (p.price <= b * 1.12) s += 8;
  else s -= 20;
  if (S.mode === 'buy' && S.own === 'freehold') {
    max += 10;
    if (/freehold/i.test(p.own!)) s += 10;
  }
  if (S.mode === 'buy' && S.who === 'invest') {
    max += 10;
    if (calc(p).yield! >= CONFIG.avgYield) s += 10;
  }
  S.must.forEach(m => {
    max += 7;
    if (p.am.includes(m)) s += 7;
  });
  return Math.max(5, Math.min(99, Math.round((100 * s) / max)));
}
export interface Ranked {
  p: Listing;
  s: number;
  fit?: boolean;
}
export const ranked = (): Ranked[] =>
  LISTINGS.filter(p => p.mode === (S.mode || 'rent'))
    .map(p => ({p, s: score(p)}))
    .sort((a, b) => b.s - a.s);

/* ============ LIVE MATCH ENGINE ============ */
/* hard filters use only given answers; o overrides one answer for "what if" counts */
interface Override {
  area?: string;
  type?: string;
  beds?: number;
  b?: number;
}
function fitsWith(p: Listing, o: Override = {}) {
  if (p.mode !== (S.mode || 'rent')) return false;
  const area = 'area' in o ? o.area : S.done.has('area') ? S.area : null;
  const type = 'type' in o ? o.type : S.done.has('property') ? S.type : 'any';
  const beds = 'beds' in o ? o.beds : S.done.has('property') ? S.beds : 0;
  const b = 'b' in o ? o.b : S.done.has('budget') ? budget() : Infinity;
  if (area && area !== 'any' && p.area !== area) return false;
  if (type !== 'any' && p.type !== type) return false;
  if (p.beds < beds!) return false;
  return p.price <= b! * 1.1;
}
export const pool = (o: Override = {}) => LISTINGS.filter(p => fitsWith(p, o));
export const total = () => LISTINGS.filter(p => p.mode === (S.mode || 'rent')).length;
/* one data-driven nudge for the live panel */
export function insight() {
  const now = pool(),
    rent = S.mode !== 'buy';
  if (!now.length) {
    const relaxArea = S.done.has('area') && S.area !== 'any' ? pool({area: 'any'}).length : 0;
    if (relaxArea)
      return `Nothing in ${S.area} fits every answer yet. ${relaxArea} home${relaxArea > 1 ? 's fit' : ' fits'} elsewhere: try “Not sure” on area.`;
    const cheapest = LISTINGS.filter(p => fitsWith(p, {b: Infinity})).sort((a, b) => a.price - b.price)[0];
    if (cheapest)
      return `Nothing fits that budget yet. From ${money(cheapest.price)}${rent ? '/mo' : ''} you’d have options.`;
    return 'Nothing fits every answer yet. Loosen one answer and I’ll update instantly.';
  }
  if (S.done.has('budget')) {
    const over = LISTINGS.filter(p => fitsWith(p, {b: Infinity}) && !now.includes(p)).sort(
      (a, b) => a.price - b.price
    )[0];
    if (over) {
      const extra = over.price - budget();
      const opens = pool({b: over.price / 1.1 + 1}).length - now.length;
      if (extra > 0 && opens > 0 && extra < budget() * 0.35)
        return `Add ${money(Math.ceil(extra / 1000) * 1000)}${rent ? '/mo' : ''} and ${opens} more home${opens > 1 ? 's' : ''} open up, including ${over.name}.`;
    }
  }
  if (!S.done.has('area')) {
    const best = ranked()
        .filter(x => now.includes(x.p))
        .slice(0, 4),
      by: Record<string, number> = {};
    best.forEach(x => (by[x.p.area] = (by[x.p.area] || 0) + x.s));
    const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    if (top)
      return `Your strongest matches so far are in ${top[0]}${recArea() && recArea() !== top[0] ? `, with ${recArea()} close behind` : ''}.`;
  }
  if (S.must.size) {
    const all = now.filter(p => [...S.must].every(m => p.am.includes(m))).length;
    if (all) return `${all} of these tick every must-have on your list.`;
    const best = now
      .map(p => [p, [...S.must].filter(m => p.am.includes(m)).length] as const)
      .sort((a, b) => b[1] - a[1])[0];
    return `None tick every must-have yet. ${best[0].name} has ${best[1]} of ${S.must.size}.`;
  }
  const v = now.map(p => [p, calc(p).diff] as const).sort((a, b) => b[1] - a[1])[0];
  if (v && v[1] > 0) return `Best value so far: ${v[0].name}, ${money(v[1])} below the ${v[0].area} average.`;
  return `${now.length} homes fit so far. Each answer sharpens the list.`;
}
/* why a home suits this guest */
export function reasons(p: Listing) {
  const r: string[] = [],
    miss: string[] = [],
    c = calc(p),
    v = vibeOf(),
    rent = p.mode === 'rent';
  if (S.area && S.area !== 'any' && p.area === S.area) r.push(`In ${p.area}, the area you picked`);
  else if (recArea() === p.area) r.push(`In ${p.area}, our pick for ${whoLabel().toLowerCase() || 'you'}`);
  if (v && v[2].length && v[2].every(m => p.am.includes(m))) r.push(`Fits your style: ${v[1].toLowerCase()}`);
  const hit = [...S.must].filter(m => p.am.includes(m));
  if (hit.length) r.push(`Has ${listify(hit.map(k => AMEN[k].toLowerCase()))}`);
  if (p.price <= budget())
    r.push(
      budget() - p.price > 0
        ? `${money(budget() - p.price)}${rent ? '/mo' : ''} under your budget`
        : 'Right on your budget'
    );
  if (c.diff > 0) r.push(`${money(c.diff)}${rent ? '/mo' : ''} below the ${p.area} average`);
  if (p.beds > S.beds) r.push(`A spare bedroom (${p.beds} in total)`);
  if (!rent && c.yield! >= CONFIG.avgYield) r.push(`${(c.yield! * 100).toFixed(1)}% estimated yield, above typical`);
  [...S.must].filter(m => !p.am.includes(m)).forEach(m => miss.push(AMEN[m].toLowerCase()));
  if (p.price > budget()) miss.push(`${money(p.price - budget())}${rent ? '/mo' : ''} over budget`);
  return {r, miss};
}
export function sorted() {
  const list = ranked(),
    inPool = new Set(pool().map(p => p.id));
  list.forEach(x => (x.fit = inPool.has(x.p.id)));
  if (S.sort === 'price') list.sort((a, b) => a.p.price - b.p.price);
  else if (S.sort === 'value') list.sort((a, b) => calc(b.p).pct - calc(a.p).pct);
  else list.sort((a, b) => +b.fit! - +a.fit! || b.s - a.s);
  return list;
}

/* home shown on the match screen: the guest's pick, else the best fit */
export function ensurePick(list: Ranked[]) {
  if (list.length && (!S.pick || !list.some(x => x.p.id === S.pick))) S.pick = (list.find(x => x.fit) || list[0]).p.id;
}

/* ============ PERSONA LOGIC ============ */
export function applyPersona(k: string) {
  const p = PERSONAS[k];
  if (!p) return;
  S.who = k;
  S.vibe = null;
  S.people = null;
  Object.assign(S, {type: p.def.type, beds: p.def.beds, lease: p.def.lease});
  S.budget.rent = p.def.budget;
  S.must = new Set(p.def.must);
}
export function applyVibe(v: string) {
  const p = P();
  const row = p!.vibes.find(x => x[0] === v);
  if (!row) return;
  S.vibe = v;
  row[2].forEach(m => S.must.add(m));
  if (S.who === 'friends') {
    S.people = row[4]!;
    S.beds = Math.min(6, row[4]!);
    S.type = 'villa';
    S.budget.rent = Math.max(S.budget.rent, 22000 * row[4]!);
  }
  if (S.who === 'solo' && v === 'value') {
    S.type = 'condo';
    S.budget.rent = Math.min(S.budget.rent, 18000);
  }
  if (S.who === 'business') {
    if (v === 'project') S.lease = 6;
    if (v === 'exec') {
      S.type = 'villa';
      S.beds = 3;
      S.budget.rent = 120000;
    }
    if (v === 'relocate') {
      S.lease = 12;
    }
  }
  if (S.who === 'family' && v === 'little') S.must.delete('school');
}

const VIBE_PHRASE: Record<string, string> = {
  'nomad.home': 'who needs a proper home office to focus',
  'nomad.cafe': 'who likes cafés and coworking close by',
  'nomad.beach': 'who wants to work with the beach nearby',
  'nomad.mix': 'who wants a home desk and coworking nearby',
  'couple.sunset': 'who love beach days and sunsets',
  'couple.private': 'after somewhere quiet and private',
  'couple.dining': 'who enjoy dining and nightlife',
  'couple.wellness': 'focused on wellness and training',
  'solo.social': 'keen to meet people',
  'solo.calm': 'after peace and quiet',
  'solo.value': 'keeping costs sensible',
  'solo.fit': 'here to train',
  'business.relocate': 'relocating for work',
  'business.project': 'on a project or secondment',
  'business.staff': 'housing staff',
  'business.exec': 'looking for an executive home',
  'family.little': 'with little ones under 5',
  'family.school': 'with school-age kids',
  'family.teens': 'with teenagers',
  'family.pets': 'with kids and pets',
  'retire.calm': 'wanting somewhere calm and green',
  'retire.care': 'wanting to be near hospitals and shops',
  'retire.sea': 'wanting to live by the sea',
  'retire.active': 'wanting an active, social life'
};
/* plain-English playback of the brief */
export function articulate() {
  const rent = S.mode !== 'buy',
    v = vibeOf(),
    bits: string[] = [];
  const typ =
    S.type === 'any'
      ? S.beds > 1
        ? `${S.beds}-bedroom home`
        : 'one-bedroom home'
      : `${S.beds}-bedroom ${TYPES[S.type].toLowerCase()}`;
  const where = S.area && S.area !== 'any' ? `in ${S.area}` : 'wherever suits you best';
  const mustTxt = listify([...S.must].map(k => AMEN[k].toLowerCase()));
  if (rent) {
    const who =
      {
        nomad: 'a digital nomad',
        couple: 'a couple',
        solo: 'going solo',
        business: 'here on business',
        family: 'a family',
        retire: 'settling in for retirement',
        friends: `${S.people ? S.people + ' friends' : 'friends'} sharing`
      }[S.who!] || 'looking to rent';
    const style = v && VIBE_PHRASE[S.who + '.' + S.vibe] ? ' ' + VIBE_PHRASE[S.who + '.' + S.vibe] : '';
    bits.push(`You’re ${who}${style}, looking for a ${typ} ${where}`);
    bits.push(
      `moving in ${S.moveIn === 0 ? 'as soon as possible' : monthName(moveInDate())} for ${S.lease} month${S.lease > 1 ? 's' : ''}`
    );
    bits.push(`up to ${thb(S.budget.rent)} a month`);
  } else {
    bits.push(
      `You’re buying ${S.who === 'invest' ? 'as an investment' : S.who === 'holiday' ? 'a holiday home' : 'a home to live in'}: a ${typ} ${where}`
    );
    bits.push(
      `${TIMELINES[S.timeline].toLowerCase()}, up to ${big(S.budget.buy)}${S.own !== 'any' ? `, ${S.own}` : ''}`
    );
  }
  let s = bits.join(', ') + '.';
  if (mustTxt) s += ` It needs ${mustTxt}.`;
  if (S.note) s += ` You also mentioned: “${S.note}”.`;
  return s;
}
/* one-tap fixes suggested from the summary */
export interface Refinement {
  id: string;
  label: string;
  why: string;
  fn: () => void;
}
export function refinements() {
  const out: Refinement[] = [],
    rent = S.mode !== 'buy',
    list = ranked(),
    top = list[0]?.p,
    b = budget();
  const add = (id: string, label: string, why: string, fn: () => void) => out.push({id, label, why, fn});
  if (top && top.price > b) {
    const cheaper = LISTINGS.filter(
      p => p.mode === S.mode && p.price <= b && (S.type === 'any' || p.type === S.type) && p.beds >= Math.min(S.beds, 2)
    ).sort((x, y) => x.price - y.price)[0];
    if (cheaper && cheaper.area !== S.area)
      add('area', `Look in ${cheaper.area} too`, `similar homes there fit your budget`, () => {
        S.area = 'any';
      });
    add(
      'budget',
      `Stretch to ${money(Math.ceil(top.price / (rent ? 1000 : 500000)) * (rent ? 1000 : 500000))}`,
      `opens up ${top.name}`,
      () => {
        S.budget[S.mode!] = Math.ceil(top.price / (rent ? 1000 : 500000)) * (rent ? 1000 : 500000);
      }
    );
  }
  if (rent) {
    if (S.who === 'nomad' && !S.must.has('fibre'))
      add('fibre', 'Add fast fibre', 'video calls without dropouts', () => S.must.add('fibre'));
    if (S.who === 'nomad' && S.lease < 3)
      add('lease3', 'Make it 3 months', 'longer stays unlock better monthly rates', () => {
        S.lease = 3;
      });
    if (S.who === 'nomad' && !S.must.has('cowork'))
      add('cowork', 'Near coworking', 'community and a change of scene', () => S.must.add('cowork'));
    if (S.who === 'couple' && !S.must.has('seaview'))
      add('seaview', 'Add a sea view', 'the sunset factor', () => S.must.add('seaview'));
    if (S.who === 'couple' && S.type !== 'villa')
      add('villa', 'Try a private pool villa', 'one-beds start around ฿40k', () => {
        S.type = 'villa';
        S.must.add('pool');
      });
    if (S.who === 'solo' && S.type === 'villa')
      add('condo', 'Switch to a condo', 'pool and gym included, lower rent', () => {
        S.type = 'condo';
      });
    if (S.who === 'solo' && !S.must.has('cleaning'))
      add('cleaning', 'Add cleaning', 'one less thing to think about', () => S.must.add('cleaning'));
    if (S.who === 'business' && !S.must.has('invoice'))
      add('invoice', 'Company lease & tax invoice', 'so your employer can pay directly', () => S.must.add('invoice'));
    if (S.who === 'business' && !S.must.has('cleaning'))
      add('cleaning', 'Weekly cleaning', 'come home to a reset space', () => S.must.add('cleaning'));
    if (S.who === 'family' && !S.must.has('school') && S.vibe !== 'little')
      add('school', 'Near schools', 'shorter school runs', () => S.must.add('school'));
    if (S.who === 'family' && !S.must.has('pets'))
      add('pets', 'Pet friendly', 'bring the whole family', () => S.must.add('pets'));
    if (S.who === 'retire' && !S.must.has('commute'))
      add('commute', 'Close to hospitals', 'Bangkok Hospital Phuket within 20 min', () => S.must.add('commute'));
    if (S.who === 'friends' && S.people && S.beds < S.people)
      add('beds', `${S.people} bedrooms`, 'a room each', () => {
        S.beds = S.people!;
      });
    if (S.lease === 6)
      add('lease12', 'Make it 12 months', 'usually 5–10% lower monthly rent', () => {
        S.lease = 12;
      });
  } else {
    if (S.who === 'invest' && S.type !== 'condo')
      add('condo', 'Consider freehold condos', 'simpler ownership, strong yields', () => {
        S.type = 'condo';
        S.own = 'freehold';
      });
    if (S.who === 'home' && !S.must.has('school'))
      add('school', 'Near schools', 'if kids are coming', () => S.must.add('school'));
  }
  return out.slice(0, 4);
}

/* ============ FREE-TEXT PARSER ============ */
const WN: Record<string, number> = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6};
const n = (x: string) => WN[x] ?? parseFloat(x);
export function parseAsk(txt: string) {
  const t = ' ' + txt.toLowerCase().replace(/,/g, '') + ' ',
    got: string[] = [];
  let m: RegExpMatchArray | null;
  if (/\b(buy|buying|purchase|invest|investment|for sale|freehold|leasehold)\b/.test(t)) {
    S.mode = 'buy';
    got.push('Buy');
  } else if (
    /\b(rent|rental|renting|lease|monthly|per month|a month|months|long.?term|nomad|remote|relocat)\b/.test(t) ||
    !/\bbuy/.test(t)
  ) {
    S.mode = 'rent';
  }
  S.done.add('mode');
  if (S.mode === 'rent') {
    const who: [string, RegExp][] = [
      ['business', /business|company|corporate|relocat|secondment|staff|employee|work permit|expat assignment/],
      ['nomad', /nomad|remote|freelanc|laptop|work online/],
      ['family', /family|kids|children|school|baby/],
      ['friends', /friends|sharing|share|flatmates|housemates/],
      ['retire', /retire|retirement|pension/],
      ['couple', /couple|partner|wife|husband|girlfriend|boyfriend|honeymoon/],
      ['solo', /\bsolo\b|alone|myself|just me|single|on my own/]
    ];
    for (const [k, re] of who) {
      if (re.test(t)) {
        applyPersona(k);
        S.done.add('who');
        got.push(PERSONAS[k].l);
        break;
      }
    }
  } else {
    const bw: [string, RegExp][] = [
      ['invest', /invest|yield|rental income|roi/],
      ['holiday', /holiday home|second home|vacation/],
      ['home', /live|residence|move/]
    ];
    for (const [k, re] of bw) {
      if (re.test(t)) {
        S.who = k;
        S.done.add('who');
        got.push(BUYERS.find(b => b.k === k)!.l);
        break;
      }
    }
  }
  /* an area's name or one of its other names (Website settings), e.g. "khao lak" → Phang Nga */
  AREAS.forEach(a => {
    if ([a.k, ...a.aliases].some(n => t.includes(n.toLowerCase()))) {
      S.area = a.k;
      S.done.add('area');
      got.push(a.k);
    }
  });
  if (/condo|apartment|flat|studio/.test(t)) {
    S.type = 'condo';
    got.push('Condo');
  } else if (/townhouse|town house/.test(t)) {
    S.type = 'townhouse';
    got.push('Townhouse');
  } else if (/villa/.test(t)) {
    S.type = 'villa';
    got.push('Villa');
  } else if (/\bhouse\b/.test(t)) {
    S.type = 'house';
    got.push('House');
  }
  if (/studio/.test(t)) S.beds = 1;
  if ((m = t.match(/(\d+|one|two|three|four|five|six)\s*-?\s*(bed|bedroom|br|bdr)/))) {
    S.beds = Math.min(6, Math.max(1, n(m[1])));
    S.done.add('property');
    got.push(S.beds + ' bed');
  }
  if ((m = t.match(/(\d+|two|three|four|five|six)\s*(of us|people|friends|adults)/)) && S.who === 'friends') {
    S.people = Math.min(6, n(m[1]));
    S.beds = Math.max(S.beds, S.people);
    S.vibe = String(Math.min(5, S.people));
  }
  if (/freehold/.test(t)) {
    S.own = 'freehold';
    got.push('Freehold');
  }
  if ((m = t.match(/(1|3|6|12|24|one|three|six|twelve)\s*months?/))) {
    S.lease = {one: 1, three: 3, six: 6, twelve: 12}[m[1]] || +m[1];
    got.push(S.lease + '-month stay');
  } else if (/1 year|one year|a year/.test(t)) {
    S.lease = 12;
    got.push('12 months');
  } else if (/2 years|two years/.test(t)) {
    S.lease = 24;
    got.push('24 months');
  }
  if (/asap|right away|urgent|immediately/.test(t)) {
    S.timeline = 'now';
    S.moveIn = 0;
    got.push('ASAP');
  }
  if (
    (m = t.match(/(?:฿|thb\s*)?(\d+(?:\.\d+)?)\s*(k|m|million)?\s*(?:thb|baht|฿)?\s*(?:a|per|\/)\s*month/)) ||
    (S.mode === 'rent' && (m = t.match(/(?:under|below|max|budget|up to)\s*(?:฿)?(\d+(?:\.\d+)?)\s*(k)\b/)))
  ) {
    const v = n(m[1]) * (m[2] === 'k' ? 1e3 : m[2] ? 1e6 : 1);
    if (v >= 5000 && v <= 1e6) {
      S.budget.rent = Math.round(v / 1000) * 1000;
      S.done.add('budget');
      got.push('≤ ' + thb(S.budget.rent) + '/mo');
    }
  } else if ((m = t.match(/(?:฿|thb\s*)?(\d+(?:\.\d+)?)\s*(m|million|mil)\b/))) {
    const v = n(m[1]) * 1e6;
    S.budget.buy = v;
    S.mode = 'buy';
    S.done.add('budget');
    got.push('≤ ' + big(v));
  } else if ((m = t.match(/\$\s?(\d+(?:\.\d+)?)\s*(k|m)?/))) {
    const v = n(m[1]) * (m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1) * 33;
    if (S.mode === 'buy') S.budget.buy = v;
    else S.budget.rent = v;
    S.done.add('budget');
    got.push('≤ ' + big(v));
  }
  (
    [
      ['pool', /pool/],
      ['seaview', /sea ?view|ocean view/],
      ['beach', /beach/],
      ['school', /school/],
      ['furnished', /furnished/],
      ['pets', /\bpets?\b|\bdogs?\b|\bcats?\b|pet.friendly/],
      ['gym', /gym|fitness|muay thai|training/],
      ['workspace', /desk|office|workspace/],
      ['fibre', /wifi|wi-fi|internet|fibre|fiber/],
      ['cowork', /cowork|co-work|cafes|cafés/],
      ['quiet', /quiet|private|peace|secluded/],
      ['amenities', /shops|walkable|restaurants|nightlife|social/],
      ['cleaning', /clean|housekeep|maid/],
      ['invoice', /invoice|company lease|\btax\b/],
      ['commute', /airport|commute|hospital/]
    ] as [string, RegExp][]
  ).forEach(([k, re]) => {
    if (re.test(t)) {
      S.must.add(k);
      got.push(AMEN[k]);
    }
  });
  return [...new Set(got)];
}
export const VOCAB = [
  ...[
    'rent',
    'buy',
    'invest',
    'digital nomad',
    'remote work',
    'couple',
    'solo',
    'on my own',
    'business',
    'company relocation',
    'family',
    'retiring',
    'friends sharing'
  ].map(w => ({w, h: 'about you'})),
  ...AREAS.map(a => ({w: a.k, h: 'area'})),
  ...['pool villa', 'condo', 'studio', 'townhouse', 'house'].map(w => ({w, h: 'type'})),
  ...['1 bedroom', '2 bedrooms', '3 bedrooms', '4 bedrooms'].map(w => ({w, h: 'size'})),
  ...[
    'fast wifi',
    'near coworking',
    'desk',
    'private pool',
    'sea view',
    'near the beach',
    'near schools',
    'pet friendly',
    'gym',
    'weekly cleaning',
    'tax invoice',
    'near the airport',
    'quiet'
  ].map(w => ({w, h: 'must-have'})),
  ...['1 month', '3 months', '6 months', '12 months'].map(w => ({w, h: 'stay'})),
  ...[
    'under 20k a month',
    'under 40k a month',
    'under 80k a month',
    'under 150k a month',
    'under 10m',
    'under 20m'
  ].map(w => ({w, h: 'budget'}))
];
/* ============ CONCIERGE LINES (rapport) ============ */
/* returns HTML (may contain <em>), already escaped */
export function line(step: string) {
  const p = P(),
    v = vibeOf(),
    a = S.area && S.area !== 'any' && areaOf(S.area),
    rent = S.mode !== 'buy';
  switch (step) {
    case 'mode':
      return `${S.name ? `Lovely to meet you, ${esc(S.name)}. ` : 'Hi, I’m your Elevare concierge. '}${
        LISTINGS.length
          ? 'A few quick taps and I’ll find a place that fits you, then show how its price compares with the market.'
          : 'I can’t match you with a home online right now, but an advisor can.'
      }`;
    case 'who':
      return rent
        ? `${hi()}tell me a little about you. Every renter needs something different, so I’ll tailor the questions.`
        : `${hi()}buying in Phuket, exciting. What’s the property for?`;
    case 'vibe':
      return (
        {
          nomad: 'Remote work, nice. Fast fibre and a proper desk are already on my list.',
          couple: 'A place for two. I’ve started with a private pool, you can change that later.',
          solo: 'Your own place, your rules. Condos with a pool and gym usually give solo renters the best value.',
          business:
            'Here for work. I’ll look for furnished homes that can be leased in a company name with a tax invoice.',
          family: 'Family first. I’ve added a pool and schools nearby as a starting point.',
          retire: 'Welcome. Most of our retirees value calm, good healthcare and an easy routine.',
          friends:
            'Sharing is the smartest way to live well here. A big villa split four ways often costs less than four condos.'
        }[S.who!] || ''
      );
    case 'area':
      return v
        ? `“${esc(v[1])}”, got it. That points to <em>${recArea()}</em>, but here’s the full map.`
        : S.who && !rent
          ? `For ${whoLabel().toLowerCase()} buyers, <em>${recArea()}</em> is a strong start.`
          : 'Where would you like to be?';
    case 'property':
      return a
        ? `<em>${a.k}</em>: ${a.d.toLowerCase()}. ${p ? `For ${p.l.toLowerCase()} renters I’d suggest a ${TYPES[p.def.type].toLowerCase()}, already selected.` : 'What kind of property?'}`
        : 'I’ll recommend the area. What kind of property?';
    case 'timing':
      return rent
        ? `A ${S.beds}-bedroom ${TYPES[S.type]?.toLowerCase() || 'home'}. When do you want the keys?`
        : `A ${S.beds}-bedroom ${TYPES[S.type]?.toLowerCase() || 'property'}. What’s your timeline?`;
    case 'budget':
      return rent
        ? `${S.moveIn === 0 ? 'As soon as possible' : monthName(moveInDate())}, ${S.lease} month${S.lease > 1 ? 's' : ''}. ${S.lease >= 12 ? 'Twelve months usually earns the best rate.' : S.lease <= 3 ? 'Shorter stays are fine, rates are a little higher.' : ''} What monthly rent feels right?`
        : `${TIMELINES[S.timeline]}. What’s your purchase budget?`;
    case 'must':
      return `Up to ${money(budget())}${rent ? ' a month' : ''}. I’ve pre-selected what ${p ? p.l.toLowerCase() + ' renters' : 'buyers like you'} usually ask for. Add or remove anything.`;
    case 'confirm':
      return `${hi()}here’s what I heard. Check it’s right, or tap a suggestion to sharpen it.`;
    case 'match': {
      const fitN = pool().length,
        top = ranked()[0]?.p,
        below = top && calc(top).diff > 0;
      if (!fitN) return `${hi()}nothing ticks every box yet, so here are the closest. ${esc(insight())}`;
      return `${hi()}${fitN === 1 ? 'one home fits' : fitN + ' homes fit'} your brief. Here’s the strongest${below ? `, priced ${money(calc(top).diff)} below the ${top.area} average` : ''}. Save the ones you like and we’ll show you them in one trip.`;
    }
    case 'book':
      return 'Want to see it before you commit? Pick how, and I’ll write the message for you.';
    case 'send':
      return 'Your message is ready. Tap WhatsApp and it opens with everything filled in.';
  }
  return '';
}

/* ============ HELPERS ============ */
/* undefined only when the chosen mode has no homes (screens show NoHomes then) */
export const pick = (): Listing | undefined => LISTINGS.find(p => p.id === S.pick) || ranked()[0]?.p;
export const homes = (): Listing[] => {
  const s = [...S.saved].map(id => LISTINGS.find(p => p.id === id)).filter(Boolean) as Listing[];
  if (s.length) return s;
  const p = pick();
  return p ? [p] : [];
};
export function refCode() {
  const hs = homes(),
    p = hs[0],
    w = (S.who || 'x').slice(0, 3).toUpperCase(),
    ids = hs.map(h => h.id).join('+');
  return p.mode === 'rent' ? `ELV-R-${w}-${ids}-${S.lease}M` : `ELV-S-${w}-${ids}`;
}
export function buildMessage() {
  const hs = homes(),
    p = hs[0],
    rent = p.mode === 'rent',
    tour = hs.length > 1,
    names = tour ? `these ${hs.length} homes` : p.name;
  const day = addDays(today, S.day).toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'short'});
  const ask =
    S.view === 'viewing'
      ? `I'd like to view ${names} in person on ${day}, ${S.time.toLowerCase()}${tour ? ', one after another if possible' : ''}.`
      : S.view === 'video'
        ? `I'd like a live video walkthrough of ${names} on ${day}, ${S.time.toLowerCase()}.`
        : S.view === 'hold'
          ? `Please reserve ${tour ? 'my favourite of ' + names : p.name} while you confirm availability and lease terms.`
          : `Please send me the full details for ${names}: floor plan, title documents and buying costs.`;
  const quote = hs
    .map(h => {
      const c = calc(h);
      return rent
        ? `• ${h.name}, ${h.area}: ${thb(h.price)} per month (${S.lease} month${S.lease > 1 ? 's' : ''})`
        : `• ${[
            `${h.name}, ${h.area}: ${big(h.price)} asking`,
            h.baths && `${h.baths} bath`,
            h.sqm && `${h.sqm} m²`,
            h.own?.toLowerCase(),
            c.yield !== undefined && `est. yield ${(c.yield * 100).toFixed(1)}%`
          ]
            .filter(Boolean)
            .join(', ')}`;
    })
    .join('\n');
  return `Hi ${CONFIG.brand}${S.name ? `, this is ${S.name}` : ''} 👋

${ask}

About me
${articulate()
  .replace(/^You’re/, 'I’m')
  .replace('You also mentioned', 'Also')
  .replace('suits you best', 'suits me best')
  .replace(/^I’m a couple who love/, 'We’re a couple who love')
  .replace(/^I’m a couple/, 'We’re a couple')
  .replace(/^I’m (a family|\d+ friends|friends)/, 'We’re $1')}

${tour ? 'The homes' : 'The property'}
${quote}
• Ref: ${refCode()}

Could you confirm availability and the next step? Thank you!`;
}
export function statusText(ch: string) {
  return ch === 'copy'
    ? 'Copied. Paste it into WhatsApp to send it to us.'
    : 'Opening WhatsApp with your message. If nothing opened, tap Copy and paste it into WhatsApp.';
}
/* the first contact is always WhatsApp */
export function links(msg: string) {
  return {
    wa: `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`,
    contact: `Or message us on WhatsApp: +${CONFIG.whatsapp}`
  };
}
declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}
export function lead(channel: string, message: string) {
  const hs = homes(),
    p = hs[0],
    c = calc(p);
  const payload = {
    event: 'elevare_lead',
    channel,
    ref: refCode(),
    mode: p.mode,
    persona: S.who,
    style: S.vibe,
    summary: articulate(),
    note: S.note,
    listing: p.name,
    listing_id: p.id,
    listings: hs.map(h => ({id: h.id, name: h.name, price_thb: h.price})),
    compared: [...S.cmp],
    price_thb: p.price,
    market_thb: Math.round(c.m),
    area: S.area,
    type: S.type,
    beds: S.beds,
    ownership: S.own,
    move_in: p.mode === 'rent' ? iso(moveInDate()) : null,
    lease_months: p.mode === 'rent' ? S.lease : null,
    timeline: p.mode === 'buy' ? S.timeline : null,
    budget_thb: budget(),
    must: [...S.must],
    viewing: S.view,
    day: iso(addDays(today, S.day)),
    time: S.time,
    name: S.name,
    message,
    ts: new Date().toISOString()
  };
  try {
    /* Google Analytics forbids personal data: the dataLayer copy leaves out the free text and name */
    const analytics: Partial<typeof payload> = {...payload};
    delete analytics.name;
    delete analytics.message;
    delete analytics.note;
    delete analytics.summary;
    (window.dataLayer = window.dataLayer || []).push(analytics);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent('elevare:lead', {detail: payload}));
  } catch {
    /* ignore */
  }
  if (CONFIG.leadEndpoint) {
    try {
      fetch(CONFIG.leadEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }
}

/* ============ NAV ============ */
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function go(step: Step, push = true) {
  if (push && step !== cur) trail.push(cur);
  setCur(step);
  render();
  requestScroll(0, !reduced());
}
export const nextOf = (step: Step) => {
  const f = flow();
  return f[f.indexOf(step) + 1];
};
export function autoNext(key: Step) {
  S.done.add(key);
  setTimeout(() => {
    if (cur === key) go(nextOf(key));
  }, 280);
}
export function back() {
  const p = trail.pop();
  if (p) {
    setCur(p === 'matching' ? 'confirm' : p);
    render();
  }
}
export function home() {
  setTrail([]);
  go('welcome', false);
}
export {reduced};
