/* Google Analytics 4 (VITE_GA_MEASUREMENT_ID) with Consent Mode v2.
   - Analytics cookies stay off until the visitor accepts (PDPA / GDPR); before that GA only gets cookieless pings.
   - Leads: every "elevare:lead" event becomes GA4's recommended `generate_lead` (a key event to mark in GA4).
   - Contact clicks (WhatsApp, phone, SMS, email) become `contact`.
   - Never sends names, messages or contact details: Google's terms forbid personal data. */
export const GA_ID = ((import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined) ?? '').trim();
const CONSENT_KEY = 'elevare.consent';
export type Consent = 'granted' | 'denied';

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export function storedConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

/* gtag.js reads the `arguments` object, not an array, so this must be a plain function */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtag(..._args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.dataLayer.push(arguments);
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (GA_ID) gtag('event', event, params);
}

export function setConsent(consent: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    /* storage blocked: applies to this page only */
  }
  if (GA_ID) gtag('consent', 'update', {analytics_storage: consent});
}

interface LeadDetail {
  channel?: string;
  mode?: string;
  listing_id?: string;
  area?: string;
  type?: string;
  price_thb?: number;
}

let started = false;
/* public pages only (the admin area is never tracked) */
export function initAnalytics() {
  if (started || !GA_ID) return;
  started = true;
  window.gtag = gtag;
  gtag('consent', 'default', {
    analytics_storage: storedConsent() === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  gtag('js', new Date());
  gtag('config', GA_ID, {anonymize_ip: true});

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);

  window.addEventListener('elevare:lead', e => {
    const d = ((e as CustomEvent).detail ?? {}) as LeadDetail;
    track('generate_lead', {
      currency: 'THB',
      value: typeof d.price_thb === 'number' ? d.price_thb : undefined,
      lead_source: d.channel,
      listing_mode: d.mode,
      listing_id: d.listing_id,
      listing_area: d.area,
      listing_type: d.type
    });
  });

  document.addEventListener('click', e => {
    const a = (e.target as Element | null)?.closest?.('a[href]');
    const href = a?.getAttribute('href') ?? '';
    const method = href.startsWith('https://wa.me')
      ? 'whatsapp'
      : href.startsWith('tel:')
        ? 'phone'
        : href.startsWith('sms:')
          ? 'sms'
          : href.startsWith('mailto:')
            ? 'email'
            : '';
    if (method) track('contact', {method, page_path: location.pathname});
  });
}
