import {useEffect} from 'react';
import {ConsentBanner, ScrollTopButton, SiteFooter, SiteHeader, wrap} from '@/components/site/SiteChrome';
import {cx} from '@/lib/format';
import {applySeo} from '@/lib/seo';

/* `property`: the address was a property that is no longer listed (rented, sold or unpublished) */
export default function NotFoundPage({property}: {property?: boolean}) {
  useEffect(() => {
    applySeo({
      title: property
        ? 'Property not available | Elevare Property Partners'
        : 'Page not found | Elevare Property Partners',
      description: property ? 'This property is no longer available.' : 'This page does not exist.',
      path: location.pathname,
      noindex: true
    });
  }, [property]);
  return (
    <>
      <SiteHeader />
      <main className={cx(wrap, 'py-[80px] grid gap-[14px] justify-items-start')}>
        <p className="m-0 text-[12px] tracking-[.2em] uppercase text-faint font-semibold">
          {property ? 'No longer listed' : 'Error 404'}
        </p>
        <h1 className="text-[clamp(32px,5vw,52px)]">
          {property ? 'This home is no longer available' : "We couldn't find that page"}
        </h1>
        <p className="m-0 text-muted">
          {property ? 'It may have been rented or sold.' : 'The link may be old, or the address mistyped.'}
        </p>
        <div className="flex gap-[10px] flex-wrap mt-[6px]">
          <a href="/#homes" className="no-underline rounded-full py-[10px] px-[18px] font-semibold text-white bg-grad">
            See our homes
          </a>
          <a
            href="/"
            className="no-underline rounded-full py-[10px] px-[18px] font-semibold text-ink border border-line"
          >
            Go to the home page
          </a>
        </div>
      </main>
      <SiteFooter />
      <ScrollTopButton />
      <ConsentBanner />
    </>
  );
}
