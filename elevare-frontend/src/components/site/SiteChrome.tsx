/* header, footer and cookie banner for the standalone public pages (properties, 404) */
import {useEffect, useState, type ReactNode} from 'react';
import mark from '@/assets/elevare-mark.png';
import {CONFIG} from '@/concierge/data';
import {useLatest} from '@/hooks/useLatest';
import {GA_ID, setConsent, storedConsent} from '@/lib/analytics';
import {cx} from '@/lib/format';
import {whatsappUrl} from '@/lib/whatsapp';

export const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="w-[18px] h-[18px] flex-none">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
  </svg>
);

export const wrap = 'max-w-[1200px] mx-auto px-[20px] from760:px-[36px]';

const NAV: [string, string][] = [
  ['/?start=rent', 'Rent'],
  ['/?start=buy', 'Buy'],
  ['/#vision', 'Vision'],
  ['/#faq', 'FAQ']
];

export function SiteHeader({current}: {current?: string}) {
  return (
    <header className="sticky top-0 z-30 bg-[rgba(5,4,9,.88)] backdrop-blur-[12px] [border-bottom:1px_solid_var(--color-line)]">
      <div className={cx(wrap, 'h-[68px] flex items-center justify-between gap-[16px]')}>
        <a href="/" className="flex items-center gap-[10px] no-underline text-ink" aria-label="Elevare home">
          <img src={mark} alt="" className="w-[34px]" />
          <b className="font-wordmark font-medium text-[16px] tracking-[.14em]">ELEVARE</b>
        </a>
        <nav aria-label="Main" className="flex items-center gap-[4px] from760:gap-[8px]">
          {NAV.map(([href, label]) => (
            <a
              key={href}
              href={href}
              aria-current={current === href ? 'page' : undefined}
              className={cx(
                'no-underline rounded-full py-[8px] px-[12px] text-[14px] upto600:[&:nth-child(n+3)]:hidden',
                current === href ? 'text-ink bg-surface-2' : 'text-muted hover:text-ink'
              )}
            >
              {label}
            </a>
          ))}
          <a
            href="/?start=rent"
            className="no-underline rounded-full py-[9px] px-[16px] text-[13.5px] font-semibold text-white bg-grad ml-[4px] whitespace-nowrap"
          >
            Get matched
          </a>
        </nav>
      </div>
    </header>
  );
}

const footLink = 'text-muted no-underline hover:text-ink';

/* starts the rent / buy journey: on the home page right away (HomePage listens for "elevare:start"),
   from other pages through /?start= */
function JourneyLink({mode, children}: {mode: 'rent' | 'buy'; children: ReactNode}) {
  return (
    <a
      href={`/?start=${mode}`}
      className={footLink}
      onClick={e => {
        if (location.pathname !== '/') return;
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('elevare:start', {detail: mode}));
      }}
    >
      {children}
    </a>
  );
}
const footHead = 'text-ink text-[12px] tracking-[.14em] uppercase';

export function SiteFooter() {
  return (
    <footer className="[border-top:1px_solid_var(--color-line)]">
      <div className={cx(wrap, 'py-[44px] grid gap-[28px] from760:grid-cols-[1.4fr_1fr_1fr] text-[13.5px] text-muted')}>
        <div className="grid gap-[14px] content-start">
          <a href="/" className="flex items-center gap-[12px] no-underline text-ink" aria-label="Elevare home">
            <img src={mark} alt="" className="w-[44px] h-auto" />
            <span>
              <b className="block font-wordmark font-medium text-[18px] tracking-[.14em] leading-none">ELEVARE</b>
              <small className="block text-[8.5px] tracking-[.3em] text-muted mt-[6px]">PROPERTY PARTNERS</small>
            </span>
          </a>
          <span className="max-w-[36ch]">Property partners in Phuket for renting, buying and owning.</span>
        </div>
        <nav aria-label="Find a home" className="grid gap-[8px] content-start">
          <b className={footHead}>Find a home</b>
          <JourneyLink mode="buy">Buy</JourneyLink>
          <JourneyLink mode="rent">Rent</JourneyLink>
        </nav>
        <address className="not-italic grid gap-[8px] content-start">
          <b className={footHead}>Contact</b>
          <span>{CONFIG.location}</span>
          <a
            href={whatsappUrl('Hi Elevare, I’m looking for a home in Phuket.')}
            target="_blank"
            rel="noopener"
            className="text-ink no-underline hover:underline inline-flex items-center gap-[6px] font-semibold"
          >
            <WhatsAppIcon />
            WhatsApp
          </a>
          <a href={'mailto:' + CONFIG.email} className={footLink}>
            {CONFIG.email}
          </a>
          {GA_ID && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('elevare:consent'))}
              className="justify-self-start p-0 bg-transparent border-0 text-muted underline cursor-pointer text-[13px]"
            >
              Cookie settings
            </button>
          )}
        </address>
        <div className="from760:col-[1/-1] [border-top:1px_solid_var(--color-line)] pt-[18px] text-[12px] text-faint">
          © {new Date().getFullYear()} Elevare Property Partners · {CONFIG.location}
        </div>
      </div>
    </footer>
  );
}

/* "back to top": appears after the first screen; smooth scroll unless the visitor prefers reduced motion */
export function ScrollTopButton() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const toTop = () =>
    window.scrollTo({
      top: 0,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      tabIndex={shown ? 0 : -1}
      className={cx(
        'fixed z-40 right-[24px] bottom-[24px] upto600:right-[16px] upto600:bottom-[16px] w-[52px] h-[52px] upto600:w-[46px] upto600:h-[46px]',
        'grid place-items-center rounded-full border-0 p-0 cursor-pointer text-white bg-grad shadow-[0_12px_32px_rgba(192,79,208,.45)]',
        '[transition:opacity_.25s,transform_.25s] hover:[transform:translateY(-3px)]',
        shown ? 'opacity-100' : 'opacity-0 pointer-events-none translate-y-[12px]'
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

/* only shown when analytics is configured and the visitor hasn't chosen yet ("Cookie settings" reopens it) */
export function ConsentBanner() {
  const [open, setOpen] = useState(() => !!GA_ID && storedConsent() === null);
  useOnEvent('elevare:consent', () => setOpen(true));
  if (!open) return null;
  const choose = (c: 'granted' | 'denied') => {
    setConsent(c);
    setOpen(false);
  };
  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed z-50 left-[16px] right-[16px] bottom-[16px] from760:left-auto from760:max-w-[420px] bg-surface border border-line rounded-[16px] p-[16px] shadow-[0_20px_60px_rgba(0,0,0,.5)] grid gap-[12px] text-[13.5px]"
    >
      <p className="m-0 text-muted">
        We use analytics cookies to understand which homes and pages help people most. No advertising, and nothing is
        shared for marketing.
      </p>
      <div className="flex gap-[8px] justify-end">
        <ConsentButton onClick={() => choose('denied')}>Decline</ConsentButton>
        <ConsentButton primary onClick={() => choose('granted')}>
          Accept
        </ConsentButton>
      </div>
    </div>
  );
}

const ConsentButton = ({primary, onClick, children}: {primary?: boolean; onClick: () => void; children: ReactNode}) => (
  <button
    type="button"
    onClick={onClick}
    className={cx(
      'rounded-full py-[8px] px-[16px] font-semibold cursor-pointer text-[13px]',
      primary ? 'border-0 bg-grad text-white' : 'bg-transparent border border-line text-ink'
    )}
  >
    {children}
  </button>
);

function useOnEvent(name: string, handler: () => void) {
  const latest = useLatest(handler);
  useEffect(() => {
    const on = () => latest.current();
    window.addEventListener(name, on);
    return () => window.removeEventListener(name, on);
  }, [name, latest]);
}
