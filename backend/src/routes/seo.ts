/* Search visibility.
   GET /sitemap.xml   home, property index pages and every published property (from MongoDB)
   With FRONTEND_DIST set, the built website is served from here and each page's HTML carries its own title,
   description, canonical, hreflang, Open Graph, region tags, JSON-LD and a crawlable text version, so search engines
   and link previews see real content without running JavaScript. Keep in sync with elevare-frontend/src/lib/seo.ts. */
import express, {Router, type Request, type Response} from 'express';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {env} from '../config/env.js';
import {LISTING_COLS, one, query, type ListingRow} from '../db/pg.js';
import {log} from '../lib/logger.js';

const BRAND = 'Elevare Property Partners';
const TYPE_LABEL: Record<string, string> = {villa: 'Villa', condo: 'Condo', townhouse: 'Townhouse'};
/* the old property list pages were removed: their addresses redirect to the home page */
const OLD_LIST_PAGES = new Set(['/properties', '/properties/for-rent', '/properties/for-sale']);

/* ---------- helpers ---------- */
const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!);
const abs = (path: string) => env.siteUrl + path;
/* uploads on Vercel Blob are already absolute */
const photoUrl = (p: string) => (p.startsWith('https://') ? p : abs(p));
const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const listingPath = (l: Pick<ListingRow, 'id' | 'name'>) => `/properties/${slug(l.name)}-${l.id}`;
const idFromPath = (path: string) => /^\/properties\/[a-z0-9-]*-([A-Za-z0-9]+)$/.exec(path)?.[1];
/* " · 120 m²" when the floor area is known, else nothing */
const area = (l: ListingRow, before: string, after = '') => (l.sqm != null ? `${before}${l.sqm} m²${after}` : '');
const thb = (n: number) => '฿' + n.toLocaleString('en-US');
const priceText = (l: ListingRow) => thb(l.price) + (l.mode === 'rent' ? '/month' : '');
const published = async () =>
  (await query<ListingRow>(`select ${LISTING_COLS} from listings where published order by mode desc, seq`)).rows;

/* ---------- sitemap ---------- */
export const seoRouter = Router();

seoRouter.get('/sitemap.xml', async (_req, res) => {
  const rows = await published();
  const latest = rows.reduce<Date | undefined>((d, r) => (!d || r.updatedAt > d ? r.updatedAt : d), undefined);
  const url = (path: string, lastmod?: Date, priority = '0.6') =>
    `<url><loc>${esc(abs(path))}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}` +
    `<xhtml:link rel="alternate" hreflang="en" href="${esc(abs(path))}"/>` +
    `<xhtml:link rel="alternate" hreflang="en-TH" href="${esc(abs(path))}"/>` +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(abs(path))}"/>` +
    `<priority>${priority}</priority></url>`;
  const body = [url('/', latest, '1.0'), ...rows.map(r => url(listingPath(r), r.updatedAt))].join('');
  res
    .type('application/xml')
    .set('Cache-Control', 'public, max-age=900')
    .send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`
    );
});

/* ---------- per-page head + crawlable content ---------- */
interface Page {
  status: number;
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object[];
  body?: string;
}

function listingJsonLd(l: ListingRow) {
  const url = abs(listingPath(l));
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: l.name,
    url,
    description: l.line,
    image: l.photo ? photoUrl(l.photo) : abs('/og/elevare-og.jpg'),
    datePosted: l.createdAt.toISOString(),
    offers: {
      '@type': 'Offer',
      price: l.price,
      priceCurrency: 'THB',
      businessFunction:
        l.mode === 'rent' ? 'http://purl.org/goodrelations/v1#LeaseOut' : 'http://purl.org/goodrelations/v1#Sell',
      availability: 'https://schema.org/InStock',
      seller: {'@id': abs('/#organization')}
    },
    about: {
      '@type': l.type === 'condo' ? 'Apartment' : 'House',
      name: l.name,
      numberOfRooms: l.beds,
      numberOfBedrooms: l.beds,
      ...(l.baths != null && {numberOfBathroomsTotal: l.baths}),
      ...(l.sqm != null && {floorSize: {'@type': 'QuantitativeValue', value: l.sqm, unitCode: 'MTK'}}),
      address: {'@type': 'PostalAddress', addressLocality: l.area, addressRegion: 'Phuket', addressCountry: 'TH'}
    }
  };
}

const breadcrumbs = (items: [string, string][]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, path], i) => ({'@type': 'ListItem', position: i + 1, name, item: abs(path)}))
});

const cardHtml = (l: ListingRow) =>
  `<li><a href="${esc(listingPath(l))}">${esc(l.name)}</a> · ${esc(l.area)} · ${l.beds} bed${l.baths != null ? ` · ${l.baths} bath` : ''} ${esc(TYPE_LABEL[l.type] ?? l.type)}${area(l, ' · ')} · ${esc(priceText(l))}</li>`;

async function pageFor(path: string): Promise<Page | null> {
  if (path === '/') return null; /* index.html already carries the home page's tags */
  if (/^\/admin([-_/]|$)/i.test(path))
    return {status: 200, title: `Admin · ${BRAND}`, description: '', path, noindex: true};

  const id = idFromPath(path);
  const l = id ? await one<ListingRow>(`select ${LISTING_COLS} from listings where id = $1 and published`, [id]) : null;
  if (!l)
    return {
      status: 404,
      title: `Page not found | ${BRAND}`,
      description: 'This page does not exist or the property is no longer available.',
      path,
      noindex: true
    };
  const what = `${l.beds}-bed ${(TYPE_LABEL[l.type] ?? l.type).toLowerCase()} ${l.mode === 'rent' ? 'for rent' : 'for sale'} in ${l.area}, Phuket`;
  return {
    status: 200,
    title: `${l.name}: ${what} | ${BRAND}`,
    description: `${what}.${area(l, ' ', ',')} ${priceText(l)}. ${l.line}`.slice(0, 300),
    path: listingPath(l),
    /* link previews always show the Elevare image (the property photo stays in the page and its JSON-LD) */
    jsonLd: [
      listingJsonLd(l),
      breadcrumbs([
        ['Home', '/'],
        [l.name, listingPath(l)]
      ])
    ],
    body: `<h1>${esc(l.name)}</h1><p>${esc(what)}${area(l, ' · ')} · ${esc(priceText(l))}</p><p>${esc(l.line)}</p><ul>${l.ex.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`
  };
}

function headHtml(p: Page) {
  const url = esc(abs(p.path));
  const image = esc(p.image ?? abs('/og/elevare-og.jpg'));
  return [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    p.noindex
      ? '<meta name="robots" content="noindex, nofollow" />'
      : '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" hreflang="en" href="${url}" />`,
    `<link rel="alternate" hreflang="en-TH" href="${url}" />`,
    `<link rel="alternate" hreflang="x-default" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(p.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    ...(p.jsonLd ?? []).map(
      j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`
    )
  ].join('\n    ');
}

/* index.html marks the replaceable block with <!--seo:start--> … <!--seo:end--> */
const SEO_BLOCK = /<!--seo:start-->[\s\S]*?<!--seo:end-->/;
let template: string | null = null;

export function serveFrontend(app: express.Express) {
  if (!env.frontendDist) return;
  app.use('/assets', express.static(join(env.frontendDist, 'assets'), {maxAge: '1y', immutable: true}));
  app.use(express.static(env.frontendDist, {index: false, maxAge: '1h'}));
  app.get(/^\/(?!api\/|uploads\/).*/, async (req: Request, res: Response) => {
    template ??= await readFile(join(env.frontendDist, 'index.html'), 'utf8');
    const path = req.path.replace(/\/+$/, '') || '/';
    if (OLD_LIST_PAGES.has(path)) return res.redirect(301, '/');
    let html = template;
    let status = 200;
    try {
      /* home: a plain list of every property, so crawlers can reach each detail page (the app replaces it) */
      if (path === '/') {
        const rows = await published();
        html = html.replace(
          '<div id="root"></div>',
          `<div id="root"><h1>Homes to rent and buy in Phuket</h1><ul>${rows.map(cardHtml).join('')}</ul></div>`
        );
      }
      const page = await pageFor(path);
      if (page) {
        status = page.status;
        html = html.replace(SEO_BLOCK, `<!--seo:start-->\n    ${headHtml(page)}\n    <!--seo:end-->`);
        if (page.body) html = html.replace('<div id="root"></div>', `<div id="root">${page.body}</div>`);
      }
    } catch (e) {
      log.warn(`SEO tags not added for ${path}: ${(e as Error).message}`);
    }
    res.status(status).type('html').set('Cache-Control', 'no-cache').send(html);
  });
  log.info(`Serving the website from ${env.frontendDist}`);
}
