import {useEffect, useRef, useState} from 'react';
import {startQuiz} from '../../concierge/actions';
import {Cta} from '../ui';
import Hero from './Hero';
import Approach from './Approach';
import Services from './Services';
import Journey from './Journey';
import Experience from './Experience';
import FeaturedHomes from './FeaturedHomes';
import AreaGuide from './AreaGuide';
import Owners from './Owners';
import Faq from './Faq';
import {FinalCta, SiteFooter} from './Closing';

/* The Elevare homepage: the brand, its services, the concierge journey (and a go at it), the portfolio,
   the market, the owner view. Every section can start the concierge at the right point. */
export default function Landing() {
  const heroEnd = useRef<HTMLDivElement>(null);
  const [pastHero, setPastHero] = useState(false);
  useEffect(() => {
    const el = heroEnd.current; if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => setPastHero(e.boundingClientRect.top < 0 && !e.isIntersecting));
    io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => { document.body.classList.toggle('has-dock', pastHero); return () => document.body.classList.remove('has-dock'); }, [pastHero]);

  /* sections rise in once as they reach the viewport */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.dataset.in = ''); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { (e.target as HTMLElement).dataset.in = ''; io.unobserve(e.target); }
    }), {rootMargin: '0px 0px -8% 0px'});
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* rhythm: photo hero, then paper and dark bands in turn */
  return <>
    <Hero />
    <div ref={heroEnd} aria-hidden="true" />
    <Approach />
    <Services />
    <Journey />
    <Experience />
    <FeaturedHomes />
    <AreaGuide />
    <Owners />
    <Faq />
    <FinalCta />
    <SiteFooter />
    {/* phones: keep the next step one tap away once the hero has scrolled off */}
    <div hidden={!pastHero}
      className="from760:hidden! fixed left-0 right-0 bottom-0 z-30 bg-[rgba(17,14,24,.94)] backdrop-blur-[8px] [border-top:1px_solid_var(--color-line)] pt-[10px] px-[16px] pb-[calc(10px+env(safe-area-inset-bottom,0px))] flex items-center justify-between gap-[12px]">
      <span className="text-[13px] text-muted">Matched in about a minute</span>
      <Cta size="dock" onClick={startQuiz}>Start your brief →</Cta>
    </div>
  </>;
}
