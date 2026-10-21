import mark from '../../assets/elevare-mark.png';
import {CONFIG} from '../../concierge/data';
import {chooseMode, startQuiz} from '../../concierge/actions';
import {photo, PHOTOS} from '../../concierge/photos';
import {Cta} from '../ui';
import {wrap} from './parts';

const contact = () => [
  CONFIG.whatsapp && {l: 'WhatsApp +' + CONFIG.whatsapp, href: 'https://wa.me/' + CONFIG.whatsapp},
  CONFIG.sms && {l: 'Phone ' + CONFIG.sms, href: 'tel:' + CONFIG.sms},
  CONFIG.email && {l: CONFIG.email, href: 'mailto:' + CONFIG.email}
].filter(Boolean) as {l: string; href: string}[];

/* the last word, over a Phuket sunset */
export function FinalCta() {
  const c = contact(), ph = photo('sunset');
  return (
    <section id="contact" aria-labelledby="contact-h" className="relative isolate overflow-hidden scroll-mt-[64px] text-white">
      <img src={ph.src} width={ph.w} height={ph.h} alt="" loading="lazy" className="absolute inset-0 -z-20 w-full h-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,4,9,.3)_0%,rgba(5,4,9,.5)_60%,rgba(5,4,9,1)_100%)]" />
      <div data-reveal className={wrap + ' py-[150px] upto600:py-[110px] grid gap-[20px] justify-items-center text-center'}>
        <img src={mark} alt="" className="w-[64px]" />
        <h2 id="contact-h" className="text-[clamp(40px,6.4vw,80px)] max-w-[16ch] leading-[1]">Let’s find your place in Phuket.</h2>
        <p className="m-0 text-[rgba(245,242,250,.86)] max-w-[50ch] text-[17px]">Start a brief and see your matches in about a minute, or talk to an advisor. We reply {CONFIG.replyWindow}.</p>
        <div className="flex gap-[10px] flex-wrap justify-center mt-[8px]">
          <Cta onClick={startQuiz}>Start your brief →</Cta>
          <Cta secondary onClick={() => chooseMode('buy')}>I’m buying</Cta>
        </div>
        {c.length > 0 && (
          <ul className="list-none m-0 p-0 flex flex-wrap justify-center gap-x-[22px] gap-y-[6px] text-[14px]">
            {c.map(x => <li key={x.href}><a className="text-white no-underline hover:text-pink" href={x.href}>{x.l}</a></li>)}
          </ul>
        )}
        <span className="text-[11px] text-[rgba(245,242,250,.55)] mt-[18px]">{ph.caption}</span>
      </div>
    </section>
  );
}

const COLS: [string, [string, string][]][] = [
  ['Services', [['#services', 'Rentals'], ['#services', 'Sales'], ['#owners', 'Asset management']]],
  ['Explore', [['#journey', 'The concierge'], ['#homes', 'Portfolio'], ['#areas', 'Areas & prices']]],
  ['Help', [['#faq', 'Questions'], ['#contact', 'Contact']]]
];

export function SiteFooter() {
  return (
    <footer className="bg-bg">
      <div className={wrap + ' pt-[48px] pb-[40px] grid gap-[28px] text-[13px] text-muted from760:grid-cols-[1.4fr_repeat(3,1fr)]'}>
        <div className="grid gap-[10px] content-start">
          <span className="flex items-center gap-[10px]">
            <img src={mark} alt="" className="w-[34px]" />
            <b className="font-wordmark font-medium text-[15px] tracking-[.14em] text-ink">ELEVARE</b>
          </span>
          <span className="max-w-[34ch]">Property partners in Phuket for renting, buying and owning.</span>
        </div>
        {COLS.map(([h, links]) => (
          <nav key={h} aria-label={h} className="grid gap-[8px] content-start">
            <b className="text-ink text-[12px] tracking-[.14em] uppercase">{h}</b>
            {links.map(([href, l]) => <a key={l} href={href} className="text-muted no-underline hover:text-ink">{l}</a>)}
          </nav>
        ))}
        <div className="col-[1/-1] [border-top:1px_solid_var(--color-line)] pt-[16px] grid gap-[10px] text-[11.5px] text-faint">
          <div className="flex flex-wrap justify-between gap-[10px]">
            <span>© {new Date().getFullYear()} Elevare Property Partners. Phuket, Thailand.</span>
            <span>{CONFIG.marketNote} Listings are samples; their photos are illustrative.</span>
          </div>
          <details>
            <summary className="cursor-pointer text-muted">Photo credits (Wikimedia Commons)</summary>
            <ul className="list-none m-0 mt-[10px] p-0 grid gap-[4px] from760:grid-cols-2">
              {Object.values(PHOTOS).map(p => (
                <li key={p.src}><a href={p.page} target="_blank" rel="noopener" className="text-muted hover:text-ink">{p.caption}</a> · {p.author} · {p.license}</li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </footer>
  );
}
