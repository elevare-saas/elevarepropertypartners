/* random homes from the database, 6 at a time (show more / show less), with a rent | buy switch */
import {useState} from 'react';
import {LISTINGS, hasHomes, type Mode} from '@/concierge/data';
import {openListing} from '@/concierge/actions';
import {cx} from '@/lib/format';
import ListingCard from '@/components/site/ListingCard';
import {NoHomes} from '@/pages/home/components/ui';
import {Band, Heading} from './parts';

/* listings are loaded before this module is imported: shuffle once per page load */
const SHUFFLED = [...LISTINGS].sort(() => Math.random() - 0.5);
const STEP = 6;

const moreBtn =
  'rounded-full py-[13px] px-[26px] text-[15px] font-semibold cursor-pointer text-ink bg-surface-2 border border-line hover:border-violet';

export default function FeaturedHomes() {
  const modes = (['rent', 'buy'] as Mode[]).filter(hasHomes);
  const [mode, setMode] = useState<Mode>(modes[0] ?? 'rent');
  const [count, setCount] = useState(STEP);
  const all = SHUFFLED.filter(l => l.mode === mode);
  const rows = all.slice(0, count);
  const switchMode = (m: Mode) => {
    setMode(m);
    setCount(STEP);
  };

  return (
    <Band id="homes" label="homes-h">
      <div className="flex flex-wrap items-end justify-between gap-[16px]">
        <Heading id="homes-h" title="Featured properties" />
        <div className="flex items-center gap-[10px]">
          {modes.length > 1 && (
            <div role="tablist" aria-label="Rent or buy" className="flex border border-line rounded-full p-[4px]">
              {modes.map(m => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => switchMode(m)}
                  className={cx(
                    'rounded-full py-[7px] px-[16px] text-[13.5px] border-0 cursor-pointer',
                    mode === m ? 'bg-ink text-bg font-semibold' : 'bg-transparent text-muted'
                  )}
                >
                  {m === 'rent' ? 'For rent' : 'For sale'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {rows.length ? (
        <ul className="list-none m-0 mt-[32px] p-0 grid gap-x-[20px] gap-y-[32px] grid-cols-[repeat(auto-fill,minmax(270px,1fr))] from1000:grid-cols-3">
          {rows.map(l => (
            <li key={l.id}>
              <ListingCard listing={l} onOpen={openListing} />
            </li>
          ))}
        </ul>
      ) : (
        <NoHomes className="mt-[24px]" />
      )}
      {all.length > 0 && (
        <p className="m-0 mt-[32px] text-center text-[14px] text-muted" aria-live="polite">
          Showing {rows.length} of {all.length} {mode === 'rent' ? 'homes for rent' : 'homes for sale'}
        </p>
      )}
      {all.length > STEP && (
        <div className="mt-[14px] flex flex-wrap justify-center gap-[10px]">
          {count < all.length && (
            <button
              type="button"
              onClick={() => setCount(c => c + STEP)}
              className={cx(moreBtn, 'border-0 bg-grad text-white shadow-[0_12px_34px_rgba(192,79,208,.35)]')}
            >
              Show more ({Math.min(STEP, all.length - count)})
            </button>
          )}
          {count > STEP && (
            <button type="button" onClick={() => setCount(c => Math.max(STEP, c - STEP))} className={moreBtn}>
              Show less
            </button>
          )}
        </div>
      )}
    </Band>
  );
}
