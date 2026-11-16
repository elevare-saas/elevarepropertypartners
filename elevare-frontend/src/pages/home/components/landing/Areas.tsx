/* area tiles under the "Why Elevare" cards: helps visitors who don't know Phuket pick an area.
   Only areas with homes, each with a random photo of one of its listings. */
import {AREAS, LISTINGS, type Listing} from '@/concierge/data';
import {startInArea} from '@/concierge/actions';
import {randomPhotos} from '@/concierge/photos';
import {cx, thb} from '@/lib/format';

/* "rent from ฿13,500/mo", or the lowest sale price when the area has no rentals */
function fromPrice(homes: Listing[]) {
  const rent = homes.filter(l => l.mode === 'rent');
  if (rent.length) return `rent from ${thb(Math.min(...rent.map(l => l.price)))}/mo`;
  return `buy from ${thb(Math.min(...homes.map(l => l.price)))}`;
}

/* picked once per page load (listings are loaded before this module is imported) */
const tiles = AREAS.map(a => {
  const homes = LISTINGS.filter(l => l.area === a.k);
  return {
    k: a.k,
    d: a.d,
    count: homes.length,
    price: homes.length ? fromPrice(homes) : '',
    ph: randomPhotos(homes, 1)[0]
  };
})
  .filter(t => t.count > 0)
  .sort((a, b) => b.count - a.count)
  .slice(0, 9); /* 1 large + 8 small fills the 4-column grid */

export default function AreaTiles() {
  if (!tiles.length) return null;

  return (
    <div id="areas" className="mt-[56px] scroll-mt-[80px]">
      {/* <h3 className="font-display font-medium text-[clamp(26px,3.2vw,36px)]">Explore by area</h3> */}
      <ul className="list-none m-0 mt-[20px] p-0 grid gap-[14px] grid-cols-2 from760:grid-cols-4">
        {tiles.map((t, i) => (
          <li key={t.k} className={cx(i === 0 && 'col-span-2 from760:row-span-2')}>
            <button
              type="button"
              onClick={() => startInArea(t.k)}
              aria-label={`Find a home in ${t.k}`}
              className="group relative block w-full h-full min-h-[210px] overflow-hidden rounded-[18px] bg-surface-2 border-0 p-0 text-left cursor-pointer"
            >
              {t.ph && (
                <img
                  src={t.ph.src}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover [transition:transform_.6s] group-hover:scale-[1.05]"
                />
              )}
              <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,9,.05)_25%,rgba(5,4,9,.88))]" />
              <span className="absolute left-[16px] right-[16px] bottom-[14px] grid gap-[4px] text-white">
                <b className={cx('font-display font-semibold leading-none', i === 0 ? 'text-[34px]' : 'text-[24px]')}>
                  {t.k}
                </b>
                <span
                  className={cx(
                    'text-[rgba(255,255,255,.88)] leading-snug line-clamp-2',
                    i === 0 ? 'text-[15px]' : 'text-[12.5px]'
                  )}
                >
                  {t.d}
                </span>
                <small className="text-[12px] text-[rgba(255,255,255,.7)]">
                  {t.count} {t.count === 1 ? 'home' : 'homes'} · {t.price}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
