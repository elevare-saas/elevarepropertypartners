/* a property's photos, one at a time with previous / next (and swipe on phones); fills its box.
   Callers key it by listing id so it starts at the cover for each home. */
import {useRef, useState} from 'react';
import PropertyImage from '@/components/site/PropertyImage';
import type {Listing} from '@/concierge/data';

const arrow =
  'absolute top-1/2 -translate-y-1/2 w-[38px] h-[38px] grid place-items-center rounded-full border-0 cursor-pointer bg-[rgba(5,4,9,.6)] text-white text-[18px] backdrop-blur-[4px] hover:bg-[rgba(5,4,9,.85)]';

export default function Gallery({
  listing,
  eager
}: {
  listing: Pick<Listing, 'name' | 'photo' | 'photos'>;
  eager?: boolean;
}) {
  const photos = listing.photos?.length ? listing.photos : listing.photo ? [listing.photo] : [];
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const n = photos.length;
  const go = (by: number) => setI(x => (x + by + n) % n);

  if (n < 2)
    return (
      <PropertyImage listing={{photo: photos[0]}} alt={listing.name} eager={eager} className="block w-full h-full" />
    );
  return (
    <div
      className="relative w-full h-full"
      role="group"
      aria-roledescription="carousel"
      aria-label={`${listing.name} photos`}
      onKeyDown={e => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
      }}
      onTouchStart={e => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={e => {
        const dx = e.changedTouches[0].clientX - (touchX.current ?? e.changedTouches[0].clientX);
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <PropertyImage
        key={photos[i]}
        listing={{photo: photos[i]}}
        alt={`${listing.name}, photo ${i + 1} of ${n}`}
        eager={eager && i === 0}
        className="block w-full h-full"
      />
      <button type="button" className={`${arrow} left-[10px]`} onClick={() => go(-1)} aria-label="Previous photo">
        ‹
      </button>
      <button type="button" className={`${arrow} right-[10px]`} onClick={() => go(1)} aria-label="Next photo">
        ›
      </button>
      <span
        className="absolute bottom-[10px] right-[12px] bg-[rgba(5,4,9,.75)] text-white rounded-full py-[3px] px-[10px] text-[12px] font-mono"
        aria-live="polite"
      >
        {i + 1} / {n}
      </span>
    </div>
  );
}
