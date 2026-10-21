/* Landing-page content: copy, plus figures derived from data.ts so the page stays true when listings change */
import {AREAS, BUY_REC, BUYERS, CONFIG, LISTINGS, PERSONAS, type Listing, type Mode} from './data';
import {calc, marketFor} from './engine';

export const COUNTS = {
  rent: LISTINGS.filter(p => p.mode === 'rent').length,
  buy: LISTINGS.filter(p => p.mode === 'buy').length,
  areas: AREAS.length
};

/* the best-value home of each kind: the hero's worked example and the featured rows */
export const byValue = (mode: Mode) =>
  LISTINGS.filter(p => p.mode === mode).map(p => ({p, c: calc(p)})).sort((a, b) => b.c.pct - a.c.pct);

/* everything the area guide shows for one area */
export interface AreaFacts {
  k: string; d: string; f: number;
  homes: {rent: number; buy: number};
  condo1: number; villa3: number; condoSqm: number;
  bestFor: string[];
}
export function areaFacts(k: string): AreaFacts {
  const a = AREAS.find(x => x.k === k);
  const bestFor = [
    ...Object.values(PERSONAS).filter(p => p.area === k || p.vibes.some(v => v[3] === k)).map(p => p.l),
    ...BUYERS.filter(b => BUY_REC[b.k] === k).map(b => b.l + ' buyers')
  ];
  return {
    ...a,
    homes: {rent: LISTINGS.filter(p => p.mode === 'rent' && p.area === k).length, buy: LISTINGS.filter(p => p.mode === 'buy' && p.area === k).length},
    condo1: marketFor('rent', k, 'condo', 1, 0),
    villa3: marketFor('rent', k, 'villa', 3, 0),
    condoSqm: marketFor('buy', k, 'condo', 1, 1),
    bestFor
  };
}
/* price level against the island average (factor 1.0) */
export const priceLevel = (f: number) => f >= 1.2 ? 'Premium' : f >= 1.05 ? 'Above average' : f > 0.95 ? 'Island average' : f >= 0.8 ? 'Good value' : 'Best value';

/* listings that match a price check, with how far below market each one is */
export const comparables = (mode: Mode, area: string, type: Listing['type']) =>
  LISTINGS.filter(p => p.mode === mode && p.area === area && p.type === type).map(p => ({p, c: calc(p)}));

export const STEPS = [
  ['Tell us what you need', 'Type it in your own words, or answer a few quick taps. About 60 seconds.'],
  ['See your matches, priced', 'Every home is ranked for you and compared with similar homes in the same area.'],
  ['View it, then decide', 'In person or on a live video walkthrough, arranged on WhatsApp.']
] as const;

export const PROMISES = [
  ['Priced against the market', 'See how each home compares with similar local listings, before you ask.'],
  ['See it first', 'In-person or live video viewing. No deposit on a rental until you have seen it.'],
  ['One local contact', 'The same Elevare advisor from your first message to the keys.']
] as const;

export const OWNERSHIP = [
  ['Foreign freehold', 'Condos', 'Foreigners can own a condo unit outright, in their own name.'],
  ['Leasehold 30 + 30 years', 'Villas and townhouses', 'The usual route for villas: a registered lease with a renewal option.'],
  ['Thai company freehold', 'Selected homes', 'Some homes are held through a Thai company. We refer you to independent lawyers to check it.']
] as const;

export const BUY_SERVICES = ['Legal due-diligence referral', 'Rental management available', 'Furniture packages on selected homes', `Typical gross yield about ${(CONFIG.avgYield * 100).toFixed(1)}%`];

export const FAQ = [
  ['How long can I rent for?', 'From one month to multi-year leases: 1, 3, 6, 12 or 24 months. Longer stays usually get a better monthly rate, often 5–10% lower on a 12-month lease.'],
  ['Does it cost anything to view?', 'No. Viewings are free, and on a rental there is no deposit until you have seen the home and you are happy with it.'],
  ['I’m not in Phuket yet. Can I still see a home?', 'Yes. Ask for a live video walkthrough: about 15 minutes, from wherever you are.'],
  ['Can my company pay the rent?', 'Yes, on selected homes: a company lease with a tax invoice, so your employer can pay directly. Choose “Business” and we filter for it.'],
  ['How do you work out the market price?', `We compare each home with typical asking prices for the same area, type and size. ${CONFIG.marketNote}`],
  ['How quickly will you reply?', `An Elevare advisor replies on WhatsApp ${CONFIG.replyWindow}.`]
] as const;

/* ============ BRAND HOMEPAGE ============ */
const rentals = LISTINGS.filter(p => p.mode === 'rent'), sales = LISTINGS.filter(p => p.mode === 'buy');
export const grossYield = (p: Listing) => p.rent * 12 / p.price;
export const HEADLINE = {
  rentFrom: Math.min(...rentals.map(p => p.price)),
  buyFrom: Math.min(...sales.map(p => p.price)),
  topYield: Math.max(...sales.map(grossYield))
};
/* sale listings ranked by estimated gross yield: the investor's view of the portfolio */
export const incomeView = () => sales.map(p => ({p, y: grossYield(p), c: calc(p)})).sort((a, b) => b.y - a.y);

export const SERVICES = [
  {k: 'rent', kicker: 'Rentals', title: 'Homes for a month or for years.',
    text: 'Villas, condos and townhouses on 1 to 24-month leases, matched to how you actually live.',
    points: ['Matched in about a minute', 'Every rent compared with the area average', 'Company leases with a tax invoice', 'Viewings in person or on live video']},
  {k: 'buy', kicker: 'Sales', title: 'Buy with the numbers in front of you.',
    text: 'Freehold condos and leasehold villas, each shown with its price per m² against the market and an estimated rental yield.',
    points: ['Price per m² against the market', 'Estimated yield on every listing', 'Legal due-diligence referral', 'Furniture packages on selected homes']},
  {k: 'own', kicker: 'Asset management', title: 'Own it here. We’ll run it like an asset.',
    text: 'For owners and investors: we price your property against the market, find the right tenants through our concierge and manage the rental.',
    points: ['Rent set against live comparables', 'Tenants matched by our concierge', 'Rental management available', 'One advisor for your property']}
] as const;

/* the concierge journey, told with one real example guest */
export const DEMO_ASK = 'Four friends sharing a pool villa in Kamala, 6 months, under 100k a month';
export const JOURNEY = [
  ['Tell us', 'Say it in your own words.', 'Type how you want to live, the way you’d tell a friend. The concierge picks out who you are, where, what kind of home, how long and your budget.'],
  ['Your brief', 'We play it back in plain English.', 'Check it’s right, then sharpen it with one-tap suggestions, like a longer lease for a better monthly rate.'],
  ['Live matching', 'Watch the list narrow as you answer.', 'Every answer filters our homes in real time, so you always know how many fit and what would open up more.'],
  ['Priced', 'Every match, priced against the market.', 'Each home is compared with typical asking prices for the same area, type and size, and we show what you keep over your stay.'],
  ['View', 'One message, and the viewing is arranged.', `Your brief, the homes and a reference code are written into a WhatsApp message for you. An advisor replies ${CONFIG.replyWindow}.`]
] as const;
