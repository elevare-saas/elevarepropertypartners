/* Hero: one headline, one line, rent / buy, or describe the home, over a fixed slideshow of scenery. */
import {useEffect, useState} from 'react';
import {hasHomes} from '@/concierge/data';
import {askGo} from '@/concierge/actions';
import {cx} from '@/lib/format';
import {ModeButtons, wrap} from './parts';

/* public/hero: AI-generated example properties (illustrative, not listings), fixed so every visit looks the same */
const photos = [
  {src: '/hero/villa-sunset.webp', w: 1344, h: 752},
  {src: '/hero/villa-living.webp', w: 1344, h: 752},
  {src: '/hero/villa-twilight.webp', w: 1344, h: 752},
  {src: '/hero/penthouse-terrace.webp', w: 1344, h: 752}
];
function AskBar() {
  const [v, setV] = useState('');
  return (
    <form
      role="search"
      aria-label="Describe the home you want"
      onSubmit={e => {
        e.preventDefault();
        askGo(v);
      }}
      className="flex items-center gap-[8px] bg-[rgba(17,14,24,.7)] backdrop-blur-[14px] border border-[rgba(255,255,255,.18)] rounded-full p-[6px] pl-[22px] max-w-[560px]"
    >
      <label htmlFor="heroAsk" className="sr-only">
        Describe the home you want
      </label>
      <input
        id="heroAsk"
        type="text"
        value={v}
        onChange={e => setV(e.target.value)}
        autoComplete="off"
        placeholder="e.g. pool villa in Bang Tao"
        className="flex-1 min-w-0 border-0! bg-transparent! p-0! text-[16px] text-white placeholder:text-[rgba(245,242,250,.6)] outline-none"
      />
      <button
        type="submit"
        className="rounded-full border-0 bg-white text-[#17131d] font-semibold text-[14.5px] py-[11px] px-[18px] cursor-pointer whitespace-nowrap"
      >
        Search
      </button>
    </form>
  );
}

export default function Hero() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (photos.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setShown(i => (i + 1) % photos.length), 6000);
    return () => clearInterval(t);
  }, []);
  const any = hasHomes('rent') || hasHomes('buy');

  return (
    <section aria-labelledby="hero-h" className="relative min-h-[100svh] grid items-end overflow-hidden bg-surface">
      {photos.map((ph, i) => (
        <img
          key={ph.src}
          src={ph.src}
          width={ph.w}
          height={ph.h}
          alt=""
          loading={i === 0 ? 'eager' : 'lazy'}
          fetchPriority={i === 0 ? 'high' : undefined}
          className={cx(
            'absolute inset-0 w-full h-full object-cover [transition:opacity_1.4s_ease,transform_7s_ease]',
            i === shown ? 'opacity-100 scale-[1.04]' : 'opacity-0 scale-100'
          )}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,9,.55)_0%,rgba(5,4,9,.2)_40%,rgba(5,4,9,.88)_100%)]" />

      <div className={cx(wrap, 'relative w-full pb-[64px] pt-[130px] grid gap-[24px] text-white')}>
        <h1 id="hero-h" className="text-[clamp(42px,7vw,88px)] leading-[.98] max-w-[14ch]">
          Your home in Phuket.
        </h1>
        <p className="m-0 text-[clamp(16px,1.6vw,19px)] text-[rgba(255,255,255,.85)] max-w-[46ch]">
          Tell us what you need. We recommend only verified homes that fit, and stay with you from your first stay to
          your purchase.
        </p>
        {any && (
          <>
            <ModeButtons tone="photo" />
            <AskBar />
          </>
        )}
      </div>
    </section>
  );
}
