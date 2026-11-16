import {useEffect} from 'react';
import {SiteFooter} from '@/components/site/SiteChrome';
import Hero from './Hero';
import FeaturedHomes from './FeaturedHomes';
import {Choose, ContactBand, Vision, Why} from './Highlights';
import Faq from './Faq';

export default function Landing() {
  /* sections rise in once on entering the viewport */
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => (el.dataset.in = ''));
      return;
    }
    const io = new IntersectionObserver(
      es =>
        es.forEach(e => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = '';
            io.unobserve(e.target);
          }
        }),
      {rootMargin: '0px 0px -8% 0px'}
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <Hero />
      <FeaturedHomes />
      <Choose />
      <Why />
      <Faq />
      <Vision />
      <ContactBand />
      <SiteFooter />
    </>
  );
}
