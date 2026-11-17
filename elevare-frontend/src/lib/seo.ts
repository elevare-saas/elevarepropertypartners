/* Per-page head tags: title, description, robots, canonical, hreflang, Open Graph and JSON-LD.
   The backend writes the same tags into the HTML when it serves the site (backend/src/routes/seo.ts), so crawlers
   see them without JavaScript; this keeps them right in the browser and in development. */
import {TYPES, type Listing} from '@/concierge/data';
import {thb} from '@/lib/format';
import {assetUrl} from '@/services/apiBase';

const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined) || 'https://www.elevarepropertypartners.com'
).replace(/\/+$/, '');
const BRAND = 'Elevare Property Partners';
const abs = (path: string) => SITE_URL + path;

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/* /properties/kata-sea-view-condo-KSC : readable words, then the id after the last dash */
export const listingPath = (l: Pick<Listing, 'id' | 'name'>) => `/properties/${slug(l.name)}-${l.id}`;
export const idFromPath = (path: string) => /^\/properties\/[a-z0-9-]*-([A-Za-z0-9]+)$/.exec(path)?.[1];

export interface Seo {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object[];
}

function upsert<T extends HTMLElement>(selector: string, create: () => T, set: (el: T) => void) {
  let el = document.head.querySelector<T>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  set(el);
}
const meta = (attr: 'name' | 'property', key: string, content: string) =>
  upsert(
    `meta[${attr}="${key}"]`,
    () => document.createElement('meta'),
    el => {
      el.setAttribute(attr, key);
      el.setAttribute('content', content);
    }
  );
const link = (rel: string, href: string, hreflang?: string) =>
  upsert(
    hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`,
    () => document.createElement('link'),
    el => {
      el.setAttribute('rel', rel);
      if (hreflang) el.setAttribute('hreflang', hreflang);
      el.setAttribute('href', href);
    }
  );

export function applySeo({title, description, path, image, noindex, jsonLd = []}: Seo) {
  const url = abs(path);
  document.title = title;
  meta('name', 'description', description);
  meta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  link('canonical', url);
  for (const lang of ['en', 'en-TH', 'x-default']) link('alternate', url, lang);
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:url', url);
  meta('property', 'og:image', image ?? abs('/og/elevare-og.jpg'));
  meta('name', 'twitter:image', image ?? abs('/og/elevare-og.jpg'));

  document.head.querySelectorAll('script[type="application/ld+json"]:not([data-site])').forEach(s => s.remove());
  for (const data of jsonLd) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify(data);
    document.head.appendChild(s);
  }
}

const breadcrumbs = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({'@type': 'ListItem', position: i + 1, name, item: abs(path)}))
});

/* the home page's tags (same as index.html), restored after showing a property */
const homeSeo: Seo = {
  title: 'Elevare Property Partners | Verified Phuket homes to rent and buy, matched to you',
  description:
    'Tell us what you need and get a short list of verified Phuket homes to rent or buy, with the reason each one fits. One team from your holiday to your purchase.',
  path: '/'
};
export const applyHomeSeo = () => applySeo(homeSeo);

const describe = (l: Listing) =>
  `${l.beds}-bed ${TYPES[l.type].toLowerCase()} ${l.mode === 'rent' ? 'for rent' : 'for sale'} in ${l.area}, Phuket`;

/* one property's tags (the backend writes the same ones for crawlers) */
export function listingSeo(l: Listing): Seo {
  const url = abs(listingPath(l));
  const image = l.photo
    ? l.photo.startsWith('/uploads/')
      ? assetUrl(l.photo)
      : abs(l.photo)
    : abs('/og/elevare-og.jpg');
  const price = thb(l.price) + (l.mode === 'rent' ? ' / month' : '');
  return {
    title: `${l.name}: ${describe(l)} | ${BRAND}`,
    description: `${describe(l)}. ${l.sqm} m², ${price}. ${l.line}`.slice(0, 300),
    path: listingPath(l),
    image,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'RealEstateListing',
        name: l.name,
        url,
        description: l.line,
        image,
        offers: {'@type': 'Offer', price: l.price, priceCurrency: 'THB', availability: 'https://schema.org/InStock'},
        about: {
          '@type': l.type === 'condo' ? 'Apartment' : 'House',
          name: l.name,
          numberOfRooms: l.beds,
          numberOfBedrooms: l.beds,
          floorSize: {'@type': 'QuantitativeValue', value: l.sqm, unitCode: 'MTK'},
          address: {'@type': 'PostalAddress', addressLocality: l.area, addressRegion: 'Phuket', addressCountry: 'TH'}
        }
      },
      breadcrumbs([
        ['Home', '/'],
        [l.name, listingPath(l)]
      ])
    ]
  };
}
