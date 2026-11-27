import PropertyImage from '@/components/site/PropertyImage';
import {placeOf, TYPES, type Listing} from '@/concierge/data';
import {thb} from '@/lib/format';
import {listingPath} from '@/lib/seo';

const priceLabel = (l: Pick<Listing, 'price' | 'mode'>) => thb(l.price) + (l.mode === 'rent' ? ' / month' : '');

const Icon = ({d}: {d: string}) => (
  <svg
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    aria-hidden="true"
  >
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const PIN = 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5';
const BED = 'M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M7 9V6h4v3M3 18v2M21 18v2';
const BATH = 'M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM6 12V6a2 2 0 0 1 4 0M7 19l-1 2M17 19l1 2';
const AREA = 'M4 4h16v16H4zM4 9h16M9 4v16';

/* a real link (not a button), so search engines can follow it; `onOpen` opens it in place instead */
export default function ListingCard({
  listing: l,
  eager,
  onOpen
}: {
  listing: Listing;
  eager?: boolean;
  onOpen?: (id: string) => void;
}) {
  return (
    <a
      href={listingPath(l)}
      onClick={e => {
        if (!onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onOpen(l.id);
      }}
      className="group h-full no-underline text-ink grid content-start gap-[12px] [transition:transform_.2s] hover:[transform:translateY(-3px)]"
    >
      <span className="relative block aspect-[4/3] overflow-hidden rounded-[16px] bg-surface-2">
        <PropertyImage
          listing={l}
          eager={eager}
          alt={`${l.name}, ${TYPES[l.type].toLowerCase()} in ${placeOf(l.area)}`}
          className="w-full h-full [transition:transform_.6s] group-hover:scale-[1.04]"
        />
        <span className="absolute top-[12px] left-[12px] rounded-full bg-[rgba(5,4,9,.72)] backdrop-blur-[6px] text-white text-[11px] font-semibold tracking-[.08em] uppercase py-[5px] px-[10px]">
          {l.mode === 'rent' ? 'For rent' : 'For sale'}
        </span>
      </span>
      <span className="grid gap-[6px] px-[2px]">
        <span className="flex items-center gap-[5px] text-muted text-[12.5px]">
          <Icon d={PIN} />
          {placeOf(l.area)}
        </span>
        <b className="text-[17px] leading-snug font-display font-semibold">{l.name}</b>
        <span className="flex items-center gap-[14px] text-muted text-[13px]">
          <span className="flex items-center gap-[5px]">
            <Icon d={BED} />
            {l.beds} bed
          </span>
          {l.baths ? (
            <span className="flex items-center gap-[5px]">
              <Icon d={BATH} />
              {l.baths} bath
            </span>
          ) : null}
          {l.sqm ? (
            <span className="flex items-center gap-[5px]">
              <Icon d={AREA} />
              {l.sqm} m²
            </span>
          ) : null}
          <span>{TYPES[l.type]}</span>
        </span>
        <span className="font-mono tabular-nums text-[16px] text-ink">{priceLabel(l)}</span>
      </span>
    </a>
  );
}
