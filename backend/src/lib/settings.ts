/* Website settings kept in the database ("site_settings": one JSON value per key) and edited in the dashboard
   (Website settings page): the areas, the market estimates behind "vs. area average", and the public contact details.
   DEFAULTS only fill the table the first time (migrate); after that the database is the source. */
import {randomBytes} from 'node:crypto';
import {one, query} from '../db/pg.js';

export const TYPES = ['villa', 'condo', 'townhouse', 'house'] as const;

export interface Area {
  id: string;
  /* the name shown everywhere and stored on each property */
  k: string;
  /* one line for the website's area tiles and the search assistant */
  d: string;
  /* price level against the island average: 1 = average, 1.25 = 25% above */
  f: number;
  /* "Phuket", or e.g. "Phang Nga" for areas in the neighbouring province */
  province: string;
  /* other names people write (in notes and searches): "Khao Lak" → Phang Nga */
  aliases: string[];
}
export interface Market {
  /* monthly rent of a furnished pool villa, by bedrooms 1–6 */
  rentBase: Record<'1' | '2' | '3' | '4' | '5' | '6', number>;
  /* rent of each type against a pool villa: 1 = same */
  typeRent: Record<(typeof TYPES)[number], number>;
  /* sale price per m², by type */
  sqmBase: Record<(typeof TYPES)[number], number>;
  /* typical gross rental yield, e.g. 0.055 = 5.5% */
  avgYield: number;
  /* the fine print under the comparison */
  note: string;
}
export interface Contact {
  /* digits only, international format, e.g. 447745334883 */
  whatsapp: string;
  email: string;
  /* "between 9:00 and 21:00 Phuket time" */
  replyWindow: string;
  location: string;
}
export interface Settings {
  areas: Area[];
  market: Market;
  contact: Contact;
}
export type SettingsKey = keyof Settings;

const area = (k: string, f: number, d: string, aliases: string[] = [], province = 'Phuket'): Omit<Area, 'id'> => ({
  k,
  d,
  f,
  province,
  aliases
});
const DEFAULT_AREAS = [
  area('Kata', 1.1, 'Surf beach, cafés and restaurants on foot'),
  area('Karon', 1.0, 'Long, easy-going beach'),
  area('Rawai', 0.85, 'Expat village feel, gyms, good value'),
  area('Nai Harn', 1.0, 'Calm lagoon beach, green and quiet', ['Naiharn']),
  area('Chalong', 0.8, 'Central, Muay Thai and fitness camps'),
  area('Phuket Town', 0.7, 'Business hub, old town, hospitals', ['Old Town', 'Town Centre']),
  area('Patong', 0.95, 'Nightlife, shopping, energy'),
  area('Kamala', 1.15, 'Relaxed bay, ocean-view homes'),
  area('Surin', 1.35, 'Prestige beach address'),
  area('Bang Tao', 1.25, 'Laguna, beach clubs, international schools', ['Bangtao', 'Laguna']),
  area('Cape Yamu', 1.4, 'Private headland, bay views'),
  area('Thalang', 0.85, 'North Phuket: near the airport, quiet and green'),
  area('Kathu', 0.85, 'Between Patong and town: golf, schools, central'),
  area('Mueang Phuket', 0.75, 'Phuket City district: town life, hospitals, schools', [
    'Muang Phuket',
    'Mueang',
    'Muang'
  ]),
  area(
    'Phang Nga',
    0.9,
    'Khao Lak and Natai beaches, quiet and green',
    ['Phangnga', 'Khao Lak', 'Khaolak', 'Natai'],
    'Phang Nga'
  )
];
export const DEFAULTS: Settings = {
  areas: DEFAULT_AREAS.map((a, i) => ({id: `a${i + 1}`, ...a})),
  market: {
    rentBase: {'1': 35000, '2': 55000, '3': 80000, '4': 120000, '5': 170000, '6': 230000},
    typeRent: {villa: 1, condo: 0.55, townhouse: 0.7, house: 0.8},
    sqmBase: {villa: 75000, condo: 110000, townhouse: 55000, house: 60000},
    avgYield: 0.055,
    note: 'Indicative Phuket market figures, Oct 2026. Replace with your own comparables.'
  },
  contact: {
    whatsapp: '447745334883',
    email: 'hello@elevarepropertypartners.com',
    replyWindow: 'between 9:00 and 21:00 Phuket time',
    location: 'Phuket, Thailand'
  }
};
export const SETTINGS_KEYS = Object.keys(DEFAULTS) as SettingsKey[];

/* the first time: fill the table with the defaults (an existing value is never overwritten) */
export async function seedSettings() {
  for (const k of SETTINGS_KEYS)
    await query(
      `insert into site_settings (key, value, updated_by) values ($1, $2, 'setup') on conflict (key) do nothing`,
      [k, JSON.stringify(DEFAULTS[k])]
    );
}

export async function getSettings(): Promise<Settings> {
  const {rows} = await query<{key: SettingsKey; value: unknown}>('select key, value from site_settings');
  const s = structuredClone(DEFAULTS);
  for (const r of rows) if (SETTINGS_KEYS.includes(r.key)) (s as Record<SettingsKey, unknown>)[r.key] = r.value;
  return s;
}
export const getAreas = async () =>
  (await one<{value: Area[]}>(`select value from site_settings where key = 'areas'`))?.value ?? DEFAULTS.areas;

/* the province of an area ("Phuket" unless the area says otherwise) */
export const provinceIn = (areas: Area[], name: string) => areas.find(a => a.k === name)?.province || 'Phuket';
/* "Kata, Phuket" · "Phang Nga" · "Mueang Phuket": a name that already says its province doesn't repeat it */
export function placeIn(areas: Area[], name: string) {
  const p = provinceIn(areas, name);
  return name.endsWith(p) ? name : `${name}, ${p}`;
}

/* ---------- checks for the dashboard's changes: the cleaned value, or the problems ---------- */
type Checked<T> = {value: T; errors: string[]};
const text = (v: unknown, max: number) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
const num = (v: unknown) => (typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, '')));
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,39}$/u;

export function checkAreas(input: unknown): Checked<Area[]> {
  const errors: string[] = [];
  const list = Array.isArray(input) ? input : [];
  if (!list.length) errors.push('Keep at least one area.');
  if (list.length > 60) errors.push('Up to 60 areas.');
  const seen = new Set<string>();
  const value = list.slice(0, 60).map((raw, i): Area => {
    const a = (raw ?? {}) as Record<string, unknown>;
    const k = text(a.k, 40);
    const label = k || `Area ${i + 1}`;
    if (!NAME.test(k)) errors.push(`${label}: the name needs 2–40 letters (spaces, dots and dashes are fine).`);
    else if (seen.has(k.toLowerCase())) errors.push(`${k} is in the list twice.`);
    seen.add(k.toLowerCase());
    const f = Math.round(num(a.f) * 100) / 100;
    if (!(f >= 0.3 && f <= 3)) errors.push(`${label}: price level must be between 30% and 300%.`);
    const province = text(a.province, 40) || 'Phuket';
    if (!NAME.test(province)) errors.push(`${label}: the province needs 2–40 letters.`);
    const aliases = [
      ...new Set(
        (Array.isArray(a.aliases) ? a.aliases : String(a.aliases ?? '').split(','))
          .map(x => text(x, 40))
          .filter(x => x && x.toLowerCase() !== k.toLowerCase())
      )
    ].slice(0, 10);
    for (const x of aliases) if (!NAME.test(x)) errors.push(`${label}: “${x}” isn't a usable other name.`);
    const id = typeof a.id === 'string' && /^[\w-]{1,40}$/.test(a.id) ? a.id : `a${randomBytes(5).toString('hex')}`;
    return {id, k, d: text(a.d, 120), f, province, aliases};
  });
  /* another area's other name would make "Khao Lak" mean two places */
  const owner = new Map<string, string>();
  for (const a of value)
    for (const n of [a.k, ...a.aliases]) {
      const was = owner.get(n.toLowerCase());
      if (was && was !== a.k) errors.push(`“${n}” is used by both ${was} and ${a.k}.`);
      owner.set(n.toLowerCase(), a.k);
    }
  return {value, errors: [...new Set(errors)]};
}

export function checkMarket(input: unknown): Checked<Market> {
  const m = (input ?? {}) as Record<string, Record<string, unknown> | unknown>;
  const errors: string[] = [];
  const amount = (v: unknown, label: string, min: number, max: number) => {
    const n = Math.round(num(v));
    if (!(n >= min && n <= max))
      errors.push(`${label}: a number from ${min.toLocaleString('en-US')} to ${max.toLocaleString('en-US')}.`);
    return n;
  };
  const share = (v: unknown, label: string) => {
    const n = Math.round(num(v) * 100) / 100;
    if (!(n >= 0.1 && n <= 3)) errors.push(`${label}: between 10% and 300%.`);
    return n;
  };
  const rb = (m.rentBase ?? {}) as Record<string, unknown>;
  const tr = (m.typeRent ?? {}) as Record<string, unknown>;
  const sb = (m.sqmBase ?? {}) as Record<string, unknown>;
  const rentBase = Object.fromEntries(
    (['1', '2', '3', '4', '5', '6'] as const).map(b => [
      b,
      amount(rb[b], `Rent for ${b} bedroom${b === '1' ? '' : 's'}`, 1000, 10_000_000)
    ])
  ) as Market['rentBase'];
  const typeRent = Object.fromEntries(TYPES.map(t => [t, share(tr[t], `Rent level for ${t}`)])) as Market['typeRent'];
  const sqmBase = Object.fromEntries(
    TYPES.map(t => [t, amount(sb[t], `Sale price per m² for ${t}`, 1000, 10_000_000)])
  ) as Market['sqmBase'];
  const avgYield = Math.round(num(m.avgYield) * 10000) / 10000;
  if (!(avgYield > 0 && avgYield <= 0.3)) errors.push('Typical yield: between 0.1% and 30%.');
  return {value: {rentBase, typeRent, sqmBase, avgYield, note: text(m.note, 200)}, errors};
}

export function checkContact(input: unknown): Checked<Contact> {
  const c = (input ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const whatsapp = String(c.whatsapp ?? '').replace(/\D/g, '');
  /* required: every contact button on the website opens WhatsApp */
  if (whatsapp.length < 8 || whatsapp.length > 15)
    errors.push('WhatsApp: the full international number, 8–15 digits (e.g. 66812345678).');
  const email = text(c.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email: not a valid address.');
  const location = text(c.location, 60);
  if (!location) errors.push('Location: e.g. “Phuket, Thailand”.');
  return {value: {whatsapp, email, replyWindow: text(c.replyWindow, 80), location}, errors};
}
