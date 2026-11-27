/* Website settings from the database (backend/src/lib/settings.ts, edited in the dashboard under Website settings):
   the areas, the market estimates and the contact details. Loaded once before any page renders, into the shared
   objects in concierge/data.ts that the rest of the site reads. */
import {AREAS, CONFIG, RENT_BASE, SQM_BASE, TYPE_RENT, type Area} from '@/concierge/data';
import {apiUrl} from '@/services/apiBase';

export interface SiteSettings {
  areas: Area[];
  market: {
    rentBase: Record<string, number>;
    typeRent: Record<string, number>;
    sqmBase: Record<string, number>;
    avgYield: number;
    note: string;
  };
  contact: {whatsapp: string; email: string; replyWindow: string; location: string};
}

/* put new settings in place (also after the dashboard saves, so its lists update straight away) */
export function applySettings(s: Partial<SiteSettings>) {
  if (s.areas) AREAS.splice(0, AREAS.length, ...s.areas.map(a => ({...a, aliases: a.aliases ?? []})));
  if (s.market) {
    Object.assign(RENT_BASE, s.market.rentBase);
    Object.assign(TYPE_RENT, s.market.typeRent);
    Object.assign(SQM_BASE, s.market.sqmBase);
    CONFIG.avgYield = s.market.avgYield;
    CONFIG.marketNote = s.market.note;
  }
  if (s.contact) Object.assign(CONFIG, s.contact);
  if (s.areas || s.contact) updateBusinessData();
}

/* index.html's business JSON-LD (email, phone, areas served) to match the settings. The server does this too for
   pages it renders; a page served straight from the CDN (the home page) gets it here, and search engines run it. */
function updateBusinessData() {
  const el = document.querySelector('script[type="application/ld+json"][data-site]');
  if (!el?.textContent) return;
  try {
    const data = JSON.parse(el.textContent) as {'@graph'?: Record<string, unknown>[]};
    const org = data['@graph']?.find(n => n['@type'] === 'RealEstateAgent');
    if (!org) return;
    if (CONFIG.email) org.email = CONFIG.email;
    if (CONFIG.whatsapp) org.telephone = '+' + CONFIG.whatsapp;
    if (AREAS.length)
      org.areaServed = [
        ...[...new Set(AREAS.map(a => a.province))].map(p => ({'@type': 'AdministrativeArea', name: `${p}, Thailand`})),
        ...AREAS.filter(a => a.k !== a.province).map(a => ({'@type': 'Place', name: a.k}))
      ];
    el.textContent = JSON.stringify(data);
  } catch {
    /* leave the built-in data */
  }
}

let loading: Promise<boolean> | null = null;
/* resolves true when loaded; on failure the site still opens (with no areas or contact details) and says nothing */
export function loadSettings() {
  loading ??= fetch(apiUrl('/api/settings'), {signal: AbortSignal.timeout(6000)})
    .then(r => (r.ok ? (r.json() as Promise<SiteSettings>) : Promise.reject(new Error('HTTP ' + r.status))))
    .then(s => {
      applySettings(s);
      return true;
    })
    .catch(e => {
      console.warn('Could not load /api/settings.', e);
      loading = null; /* try again next time */
      return false;
    });
  return loading;
}
