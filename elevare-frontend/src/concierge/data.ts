/* ported verbatim from src/demo/demo.html */
import {apiUrl} from '@/services/apiBase';

export type Mode = 'rent' | 'buy';
export type PropType = 'villa' | 'condo' | 'townhouse' | 'house';
/** [key, label, must-haves it adds, suggested area, people (friends only)] */
export type Vibe = [string, string, string[], string, number?];
export interface Persona {
  l: string;
  d: string;
  def: {type: PropType; beds: number; lease: number; budget: number; must: string[]};
  area: string;
  q: string;
  vibes: Vibe[];
  show: string[];
}
export interface Listing {
  id: string;
  mode: Mode;
  name: string;
  area: string;
  type: PropType;
  beds: number;
  /* optional */
  baths?: number;
  /* floor (built-up) area in m²: optional, so check before using */
  sqm?: number;
  /* indoor living area in m² (part of the floor area): optional */
  living?: number;
  /* plot size in m²: optional */
  land?: number;
  price: number;
  /* homes for sale: both optional; the site hides what's missing */
  own?: string;
  rent?: number;
  am: string[];
  ex: string[];
  hue: number;
  line: string;
  /* full description for the property page: paragraphs separated by a blank line */
  description?: string;
  /* uploaded (/uploads/…) or stock (/photos/…) photo */
  photo?: string;
  /* the whole gallery, cover (= photo) first */
  photos?: string[];
}

/* The values below marked "from the database" are filled by loadSettings() (src/lib/siteSettings.ts) before any page
   renders: they're edited in the dashboard (Website settings), not here. */
export const CONFIG = {
  brand: 'Elevare',
  leadEndpoint: apiUrl('/api/leads'), // leads are POSTed here as JSON; "" disables
  /* from the database: */
  whatsapp: '', // digits only, international format, e.g. "66812345678"
  email: '',
  location: '',
  replyWindow: '',
  avgYield: 0,
  marketNote: ''
};
/* Market estimates (THB), from the database: rent = monthly, furnished pool villa, by bedrooms; sale = per m², by type */
export const RENT_BASE: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
export const TYPE_RENT: Record<PropType, number> = {villa: 0, condo: 0, townhouse: 0, house: 0};
export const SQM_BASE: Record<PropType, number> = {villa: 0, condo: 0, townhouse: 0, house: 0};

export interface Area {
  k: string;
  /* one line for the area tiles and the search assistant */
  d: string;
  /* price level against the island average: 1 = average */
  f: number;
  province: string;
  /* other names people write: "Khao Lak" → Phang Nga */
  aliases: string[];
}
/* from the database, in the order set in the dashboard */
export const AREAS: Area[] = [];
/* "Phuket" unless the area says otherwise (e.g. Phang Nga) */
export const provinceOf = (area: string) => AREAS.find(a => a.k === area)?.province || 'Phuket';
/* "Kata, Phuket" · "Phang Nga" · "Mueang Phuket" (a name that already says the province doesn't repeat it) */
export const placeOf = (area: string) => (area.endsWith(provinceOf(area)) ? area : `${area}, ${provinceOf(area)}`);
export const TYPES: Record<string, string> = {
  villa: 'Pool villa',
  condo: 'Condo',
  townhouse: 'Townhouse',
  house: 'House'
};
export const AMEN: Record<string, string> = {
  pool: 'Private pool',
  fibre: 'Fast fibre internet',
  workspace: 'Dedicated desk',
  cowork: 'Near coworking & cafés',
  seaview: 'Sea view',
  beach: 'Near the beach',
  quiet: 'Quiet & private',
  amenities: 'Walk to shops & restaurants',
  gym: 'Gym nearby',
  school: 'Near international schools',
  pets: 'Pet friendly',
  cleaning: 'Weekly cleaning',
  invoice: 'Company lease & tax invoice',
  commute: 'Easy commute to town & airport',
  furnished: 'Fully furnished'
};
/* personas: defaults, a follow-up question and the must-haves shown first */
export const PERSONAS: Record<string, Persona> = {
  nomad: {
    l: 'Digital nomad',
    d: 'Remote work, fast wifi, flexible lease',
    def: {type: 'condo', beds: 1, lease: 3, budget: 35000, must: ['fibre', 'workspace']},
    area: 'Rawai',
    q: 'How do you like to work?',
    vibes: [
      ['home', 'Home office, total focus', ['workspace', 'quiet'], 'Nai Harn'],
      ['cafe', 'Cafés & coworking nearby', ['cowork', 'amenities'], 'Rawai'],
      ['beach', 'Laptop by the beach', ['beach'], 'Kata'],
      ['mix', 'A bit of everything', ['cowork', 'workspace'], 'Rawai']
    ],
    show: ['fibre', 'workspace', 'cowork', 'quiet', 'gym', 'beach', 'amenities', 'cleaning', 'pool']
  },
  couple: {
    l: 'Couple',
    d: 'A beautiful base for two',
    def: {type: 'villa', beds: 1, lease: 6, budget: 50000, must: ['pool']},
    area: 'Kata',
    q: 'What does your ideal day look like?',
    vibes: [
      ['sunset', 'Beach days & sunsets', ['beach', 'seaview'], 'Kata'],
      ['private', 'Quiet & private', ['quiet', 'pool'], 'Nai Harn'],
      ['dining', 'Dining & nightlife', ['amenities'], 'Bang Tao'],
      ['wellness', 'Wellness & training', ['gym'], 'Rawai']
    ],
    show: ['pool', 'seaview', 'beach', 'quiet', 'amenities', 'gym', 'cleaning', 'pets', 'fibre']
  },
  solo: {
    l: 'Solo',
    d: 'Your own place, on your terms',
    def: {type: 'condo', beds: 1, lease: 6, budget: 25000, must: ['gym']},
    area: 'Kata',
    q: 'What matters most to you?',
    vibes: [
      ['social', 'Meeting people', ['amenities', 'cowork'], 'Kata'],
      ['calm', 'Peace and quiet', ['quiet'], 'Nai Harn'],
      ['value', 'Keeping costs low', [], 'Chalong'],
      ['fit', 'Fitness & training', ['gym'], 'Chalong']
    ],
    show: ['gym', 'amenities', 'quiet', 'beach', 'fibre', 'cowork', 'pool', 'cleaning', 'pets']
  },
  business: {
    l: 'Business',
    d: 'Relocation, secondment or staff housing',
    def: {type: 'condo', beds: 2, lease: 12, budget: 60000, must: ['invoice', 'furnished']},
    area: 'Phuket Town',
    q: 'What’s the stay for?',
    vibes: [
      ['relocate', 'Relocating for work', ['commute', 'furnished'], 'Bang Tao'],
      ['project', 'A project or secondment', ['cleaning', 'invoice'], 'Phuket Town'],
      ['staff', 'Housing for staff', ['invoice', 'commute'], 'Phuket Town'],
      ['exec', 'Executive home', ['pool', 'cleaning', 'seaview'], 'Kamala']
    ],
    show: ['invoice', 'commute', 'furnished', 'cleaning', 'fibre', 'workspace', 'gym', 'pool', 'seaview']
  },
  family: {
    l: 'Family',
    d: 'Space, schools and a safe garden',
    def: {type: 'villa', beds: 3, lease: 12, budget: 90000, must: ['pool', 'school']},
    area: 'Bang Tao',
    q: 'Who’s coming along?',
    vibes: [
      ['little', 'Little ones under 5', ['quiet', 'pool'], 'Nai Harn'],
      ['school', 'School-age kids', ['school'], 'Bang Tao'],
      ['teens', 'Teenagers', ['amenities', 'beach'], 'Kata'],
      ['pets', 'Kids and pets', ['pets', 'school'], 'Rawai']
    ],
    show: ['school', 'pool', 'quiet', 'pets', 'beach', 'amenities', 'cleaning', 'furnished', 'gym']
  },
  retire: {
    l: 'Retiring',
    d: 'Easy living, close to care',
    def: {type: 'villa', beds: 2, lease: 12, budget: 55000, must: ['quiet']},
    area: 'Rawai',
    q: 'What pace suits you?',
    vibes: [
      ['calm', 'Calm & green', ['quiet'], 'Nai Harn'],
      ['care', 'Near hospitals & shops', ['commute', 'amenities'], 'Chalong'],
      ['sea', 'By the sea', ['seaview', 'beach'], 'Kamala'],
      ['active', 'Active & social', ['gym', 'amenities'], 'Rawai']
    ],
    show: ['quiet', 'amenities', 'commute', 'pool', 'seaview', 'beach', 'cleaning', 'pets', 'gym']
  },
  friends: {
    l: 'Friends sharing',
    d: 'Split a bigger home, live better',
    def: {type: 'villa', beds: 3, lease: 6, budget: 90000, must: ['pool']},
    area: 'Kamala',
    q: 'How many of you?',
    vibes: [
      ['2', 'Two of us', [], 'Kata', 2],
      ['3', 'Three', [], 'Kamala', 3],
      ['4', 'Four', [], 'Kamala', 4],
      ['5', 'Five or more', [], 'Bang Tao', 5]
    ],
    show: ['pool', 'fibre', 'amenities', 'beach', 'cleaning', 'gym', 'quiet', 'pets', 'seaview']
  }
};
export const BUYERS = [
  {k: 'home', l: 'Main residence', d: 'A home to live in full time'},
  {k: 'holiday', l: 'Holiday home', d: 'Use it yourself, rent it when away'},
  {k: 'invest', l: 'Investment', d: 'Rental income and capital growth'}
];
export const BUY_REC = {home: 'Nai Harn', holiday: 'Kamala', invest: 'Bang Tao'};

/* published listings from the API, filled by loadListings.ts before the home modules load; no sample fallback */
export const LISTINGS: Listing[] = [];
/* 'unavailable' when /api/listings could not be loaded (as opposed to an empty portfolio) */
export let listingsStatus: 'ok' | 'unavailable' = 'ok';
export const setListingsStatus = (s: typeof listingsStatus) => {
  listingsStatus = s;
};
/* homes on our books in one mode (rent or buy) */
export const hasHomes = (m: Mode) => LISTINGS.some(p => p.mode === m);
