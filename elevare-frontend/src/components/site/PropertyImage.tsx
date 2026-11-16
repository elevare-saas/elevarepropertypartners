/* a listing's database photo filling its box, or a neutral placeholder when it has none */
import mark from '@/assets/elevare-mark.png';
import {listingPhoto} from '@/concierge/photos';
import type {Listing} from '@/concierge/data';
import {cx} from '@/lib/format';

export default function PropertyImage({
  listing,
  alt = '',
  eager,
  className
}: {
  listing: Pick<Listing, 'photo'>;
  alt?: string;
  eager?: boolean;
  className?: string;
}) {
  const ph = listingPhoto(listing);
  if (!ph)
    return (
      <span
        role="img"
        aria-label={alt ? `${alt} (no photo yet)` : 'No photo yet'}
        className={cx(
          'grid place-items-center content-center gap-[8px] bg-[linear-gradient(135deg,var(--color-surface-2),var(--color-surface))] text-faint text-[12px]',
          className
        )}
      >
        <img src={mark} alt="" className="w-[38px] opacity-40" />
        Photo coming soon
      </span>
    );
  return (
    <img
      src={ph.src}
      width={ph.w}
      height={ph.h}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      /* with an aspect ratio, height must be auto or the width/height attributes win over it */
      className={cx(
        'object-cover',
        /\baspect-/.test(className ?? '') && !/\bh-/.test(className ?? '') && 'h-auto',
        className
      )}
    />
  );
}
