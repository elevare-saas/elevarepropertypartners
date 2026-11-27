/* Properties → Add with AI: the basic facts read straight from the staff's notes as they type, so the boxes fill
   themselves (still visible and editable). Anything not found here is left empty, and the AI reads it from the notes
   instead (backend/src/lib/aiWriter.ts); the price is never guessed. */
import {AREAS, type Mode, type PropType} from '@/concierge/data';

export interface NotesFacts {
  mode?: Mode;
  type?: PropType;
  area?: string;
  price?: number;
}

/* a reference code written in the notes: "Ref: ELV-084", "code PKT12", or a bare "ELV-084" */
export function refCodeInNotes(notes: string) {
  const labelled =
    /\b(?:ref(?:erence)?\.?(?:\s*(?:code|no\.?|number|#))?|listing\s*(?:code|id)|code)\s*[:#=-]?\s*([A-Za-z0-9][A-Za-z0-9._-]{0,29})/i.exec(
      notes
    )?.[1];
  const code = labelled && /\d/.test(labelled) ? labelled : /\b[A-Z]{2,5}-\d{1,6}\b/.exec(notes)?.[0];
  return code?.replace(/[._-]+$/, '').toUpperCase() ?? '';
}

/* ---- rent or sale ---- */
const RENT_SURE =
  /\bfor\s+rent\b|\brental\s+price\b|\brent(?:al)?\s*[:=-]|\/\s*(?:month|mo)\b|\bper\s+month\b|\bmonthly\s+rent\b|\bto\s+let\b/i;
const SALE_SURE = /\bfor\s+sale\b|\b(?:sale|selling|asking)\s+price\b|\bprice\s+for\s+sale\b|\bto\s+sell\b/i;
const RENT_HINT = /\brent(?:al)?\b|\blease\s+term\b|\bdeposit\b|\bcontract\b|\bmonthly\b/i;
const SALE_HINT = /\bsale\b|\bfreehold\b|\bleasehold\b|\bchanote\b|\btransfer\s+fees?\b|\bbuy(?:er)?s?\b/i;

function modeIn(notes: string): Mode | undefined {
  const rent = RENT_SURE.test(notes),
    sale = SALE_SURE.test(notes);
  if (rent !== sale) return rent ? 'rent' : 'buy';
  if (rent && sale) return undefined; /* both: let the AI read it */
  const r = RENT_HINT.test(notes),
    s = SALE_HINT.test(notes);
  return r !== s ? (r ? 'rent' : 'buy') : undefined;
}

/* ---- property type ---- */
function typeIn(notes: string): PropType | undefined {
  if (/\btown\s*house|\btownhome/i.test(notes)) return 'townhouse';
  if (/\bcondo(?:minium)?s?\b|\bapartment\b|\bflat\b|\bstudio\b/i.test(notes)) return 'condo';
  if (/\bvillas?\b/i.test(notes)) return 'villa';
  if (/\bhouses?\b/i.test(notes)) return 'house';
  return undefined;
}

/* ---- area: a "Location: …" line wins, otherwise the first area named ---- */
const EXTRA: Record<string, RegExp> = {
  'Bang Tao': /\bbang\s*tao\b|\blaguna\b/i,
  'Phang Nga': /\bphang\s*-?\s*nga\b(?!\s+bay)|\bkhao\s*lak\b|\bnatai\b/i,
  'Phuket Town': /\bphuket\s*town\b|\bold\s*town\b/i,
  'Mueang Phuket': /\bmu(?:e)?ang\s*(?:district\s*)?(?:phuket)?\b/i,
  'Nai Harn': /\bnai\s*harn\b|\bnaiharn\b/i,
  'Cape Yamu': /\bcape\s*yamu\b/i
};
const AREA_RE = AREAS.map(a => ({k: a.k, re: EXTRA[a.k] ?? new RegExp(`\\b${a.k.replace(/\s+/g, '\\s*')}\\b`, 'i')}));
function firstArea(text: string) {
  let best: {k: string; at: number} | undefined;
  for (const {k, re} of AREA_RE) {
    const at = text.search(re);
    if (at >= 0 && (!best || at < best.at)) best = {k, at};
  }
  return best?.k;
}
function areaIn(notes: string) {
  const line = /\b(?:location|area|located(?:\s+in)?|address|zone)\s*[:=-]?\s*([^\n]+)/i.exec(notes)?.[1];
  return (line && firstArea(line)) || firstArea(notes);
}

/* ---- price: "Rental Price: 70,000 THB/month", "Price 14.9M", "rent 70k", "฿ 25,000,000" ---- */
const AMOUNT = String.raw`(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d+)?)\s*(k|m|mb|mil(?:lion)?)?\b`;
const amount = (n: string, unit = '') => {
  const v = Number(n.replace(/[,\s]/g, ''));
  const u = unit.toLowerCase();
  return Math.round(v * (u === 'k' ? 1e3 : u ? 1e6 : 1));
};
function priceIn(notes: string) {
  const labelled = new RegExp(
    String.raw`\b(?:price|rent(?:al)?|asking|selling|sale)\b[^\d\n]{0,30}?(?:฿|thb|baht)?\s*${AMOUNT}`,
    'gi'
  );
  const withCurrency = new RegExp(String.raw`(?:฿|thb)\s*${AMOUNT}|${AMOUNT}\s*(?:฿|thb|baht)`, 'gi');
  for (const m of notes.matchAll(labelled)) {
    const v = amount(m[1], m[2]);
    if (v >= 1000) return v;
  }
  for (const m of notes.matchAll(withCurrency)) {
    const v = m[1] ? amount(m[1], m[2]) : amount(m[3], m[4]);
    if (v >= 1000) return v;
  }
  return undefined;
}

export function factsFromNotes(notes: string): NotesFacts {
  return {mode: modeIn(notes), type: typeIn(notes), area: areaIn(notes), price: priceIn(notes)};
}
