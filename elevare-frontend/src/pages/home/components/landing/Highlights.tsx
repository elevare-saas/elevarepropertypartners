/* the story bands: how Elevare differs from portals (with the demo video), why Elevare, our vision, contact */
import {useRef, useState} from 'react';
import mark from '@/assets/elevare-mark.png';
import {CONFIG} from '@/concierge/data';
import {cx} from '@/lib/format';
import {whatsappUrl} from '@/lib/whatsapp';
import {WhatsAppIcon} from '@/components/site/SiteChrome';
import AreaTiles from './Areas';
import Compare from './Compare';
import {Band, Heading, ModeButtons, wrap} from './parts';

/* what portals don't do: needs first, verified homes, one partner for the whole journey, services */
const WHY: [string, string, string][] = [
  [
    'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
    'Starts with your own',
    'Answer a few questions. Get a short list, with the reason each home fits.'
  ],
  [
    'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9 12l2 2 4-4',
    'Every home verified',
    "Owner's permission, real photos and checked prices before it's listed."
  ],
  [
    'M3 12h4l3-8 4 16 3-8h4',
    'With you all the way',
    'From your holiday to a long-term rental to buying. One team throughout.'
  ],
  [
    'M5 12h14M12 5v14M4 4h16v16H4z',
    'Concierge services',
    'Airport transfers, private chefs, relocation help and care after you move in.'
  ]
];

/* 36 MB: only its first frame loads until the visitor presses the Elevare play button; controls appear once playing */
function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative mt-[24px] rounded-[18px] overflow-hidden border border-line bg-surface">
      <video
        ref={ref}
        src="/videos/demo-video.mp4"
        poster="/videos/demo-poster.webp"
        controls={playing}
        playsInline
        preload="none"
        aria-label="Elevare demo video"
        onPlay={() => setPlaying(true)}
        onEnded={() => setPlaying(false)}
        className="block w-full aspect-[1888/934] object-contain"
      />
      {!playing && (
        <img
          src="/videos/demo-poster.webp"
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-contain bg-surface"
        />
      )}
      {!playing && (
        <button
          type="button"
          aria-label="Play the Elevare demo video"
          onClick={() => void ref.current?.play()}
          className="group absolute inset-0 grid place-items-center border-0 p-0 cursor-pointer bg-transparent bg-[radial-gradient(circle_at_center,rgba(5,4,9,.05),rgba(5,4,9,.45))]"
        >
          <span className="relative grid place-items-center w-[96px] h-[96px] upto600:w-[68px] upto600:h-[68px] rounded-full bg-grad shadow-[0_18px_50px_rgba(192,79,208,.55)] [transition:transform_.2s] group-hover:scale-[1.08]">
            <span
              aria-hidden="true"
              className="absolute inset-[-12px] rounded-full border-2 border-[rgba(224,92,181,.55)] animate-ping [animation-duration:2.2s]"
            />
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-[38%] h-[38%] ml-[6%] fill-white">
              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}

export function Choose() {
  return (
    <Band id="how" tone="paper" label="how-h">
      <Heading
        id="how-h"
        title="Portals help you search. We help you choose."
        sub="See how Elevare finds your home in 40 seconds."
      />
      <ul className="list-none m-0 mt-[32px] p-0 grid gap-[16px] from760:grid-cols-2 from1000:grid-cols-4">
        {WHY.map(([d, title, text]) => (
          <li
            key={title}
            className="bg-surface border border-line rounded-[18px] p-[24px] grid gap-[10px] content-start"
          >
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="var(--color-pink)"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d={d} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <b className="text-[18px]">{title}</b>
            <span className="text-muted text-[14.5px]">{text}</span>
          </li>
        ))}
      </ul>
      <DemoVideo />
      <ModeButtons tone="paper" className="mt-[40px] justify-center" />
    </Band>
  );
}

export function Why() {
  return (
    <Band id="why" label="why-h">
      <Heading id="why-h" title="Why Elevare" sub="How we compare with the big property marketplaces." />
      <Compare />
      <AreaTiles />
      <ModeButtons className="mt-[48px] justify-center" />
    </Band>
  );
}

const STEPS = ['Your holiday', 'Your move', 'Your purchase'];

export function Vision() {
  return (
    <section
      id="vision"
      aria-labelledby="vision-h"
      className="relative overflow-hidden bg-bg py-[140px] upto600:py-[96px] scroll-mt-[64px]"
    >
      {/* brand glows, a large faint mark, and gradient rules top and bottom */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-30%] w-[60%] h-[90%] rounded-full bg-[radial-gradient(closest-side,rgba(122,63,224,.32),transparent)] blur-[20px]" />
        <div className="absolute right-[-10%] bottom-[-35%] w-[60%] h-[95%] rounded-full bg-[radial-gradient(closest-side,rgba(224,92,181,.26),transparent)] blur-[20px]" />
        <div className="absolute left-[30%] bottom-[-20%] w-[40%] h-[60%] rounded-full bg-[radial-gradient(closest-side,rgba(85,182,242,.12),transparent)] blur-[20px]" />
        <img
          src={mark}
          alt=""
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(620px,90vw)] opacity-[.05]"
        />
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-[linear-gradient(90deg,transparent,#7a3fe0,#e05cb5,transparent)]" />
        <div className="absolute bottom-0 left-[10%] right-[10%] h-px bg-[linear-gradient(90deg,transparent,#e05cb5,#55b6f2,transparent)]" />
      </div>

      <div data-reveal className={cx(wrap, 'relative')}>
        <div className="max-w-[900px] mx-auto text-center grid gap-[26px] justify-items-center">
          <h2
            id="vision-h"
            className="flex items-center gap-[14px] text-[13px] tracking-[.28em] uppercase text-muted font-semibold"
          >
            <span aria-hidden="true" className="w-[36px] h-px bg-[linear-gradient(90deg,transparent,#e05cb5)]" />
            Our vision
            <span aria-hidden="true" className="w-[36px] h-px bg-[linear-gradient(90deg,#e05cb5,transparent)]" />
          </h2>
          <p className="m-0 font-display text-[clamp(30px,4.4vw,54px)] leading-[1.12]">
            Finding a home in Phuket should start with{' '}
            <span className="bg-[linear-gradient(90deg,#b98cff,#e05cb5,#7fc8f5)] bg-clip-text text-transparent">
              how you want to live
            </span>
            , not with a search box.
          </p>
          <p className="m-0 text-muted text-[17px] max-w-[52ch]">
            We want to be the one partner you trust at every step.
          </p>
          <ol className="list-none m-0 mt-[6px] p-0 flex flex-wrap justify-center items-center gap-[10px]">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-[10px]">
                <span className="rounded-full border border-[rgba(224,92,181,.35)] bg-[rgba(17,14,24,.6)] backdrop-blur-[6px] py-[9px] px-[18px] text-[14px] text-ink">
                  {step}
                </span>
                {i < STEPS.length - 1 && (
                  <span aria-hidden="true" className="text-pink">
                    →
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* illustrative scene (AI-generated): an advisor handing over keys in a Phuket villa; replace with a real team photo */
const CONTACT_PHOTO = '/contact/contact-keys.webp';
const pill = 'no-underline rounded-full py-[13px] px-[24px] font-semibold text-[14.5px] cursor-pointer';

export function ContactBand() {
  return (
    <section id="contact" aria-labelledby="contact-h" className="relative overflow-hidden bg-surface scroll-mt-[64px]">
      <img src={CONTACT_PHOTO} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-[rgba(5,4,9,.62)]" />
      <div
        data-reveal
        className={cx(wrap, 'relative py-[110px] upto600:py-[80px] grid gap-[18px] justify-items-start text-white')}
      >
        <h2 id="contact-h" className="text-[clamp(34px,5vw,60px)] max-w-[18ch] leading-[1.02]">
          Talk to a Phuket advisor
        </h2>
        <p className="m-0 text-[16px] text-[rgba(255,255,255,.85)]">We reply on WhatsApp {CONFIG.replyWindow}.</p>
        <a
          href={whatsappUrl('Hi Elevare, I’m looking for a home in Phuket.')}
          target="_blank"
          rel="noopener"
          className={cx(pill, 'bg-wa text-wa-ink inline-flex items-center gap-[8px] mt-[6px]')}
        >
          <WhatsAppIcon />
          Chat on WhatsApp
        </a>
      </div>
    </section>
  );
}
