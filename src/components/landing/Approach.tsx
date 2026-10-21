import {CONFIG} from '../../concierge/data';
import {COUNTS, HEADLINE, PROMISES} from '../../concierge/content';
import {photo} from '../../concierge/photos';
import {eyebrow} from '../ui';
import {Band, Pic} from './parts';

/* the brand promise beside a photo collage, with the figures that back it */
export default function Approach() {
  const figures: [string, string][] = [
    [String(COUNTS.areas), 'areas we cover, from Cape Yamu to Rawai'],
    [String(COUNTS.rent + COUNTS.buy), 'homes on our books to rent or buy'],
    [(HEADLINE.topYield * 100).toFixed(1) + '%', 'top estimated gross yield in our sales'],
    ['1', 'advisor, from your first message to the keys']
  ];
  return (
    <Band id="approach" tone="paper" label="approach-h">
      <div className="grid gap-[56px] from1000:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] items-center">
        <div className="grid gap-[22px]">
          <div className={eyebrow}>Our approach</div>
          <h2 id="approach-h" className="text-[clamp(36px,4.6vw,58px)] leading-[1.06]">
            We price every home against the market <em className="italic text-pink">before</em> we show it to you.
          </h2>
          <p className="m-0 text-muted text-[17px] max-w-[52ch]">
            Phuket asking prices vary widely, even on the same street. So every home we offer is compared with similar homes in the same area,
            by type and size, and you see the difference up front. {CONFIG.marketNote.split('.')[0]}.
          </p>
          <ul className="list-none m-0 p-0 grid gap-[14px] from760:grid-cols-3 mt-[8px]">
            {PROMISES.map(([b, t]) => (
              <li key={b} className="[border-top:2px_solid_var(--color-ink)] pt-[12px] grid gap-[4px]">
                <b className="text-[14.5px]">{b}</b><span className="text-[13.5px] text-muted">{t}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* collage: a large interior, a smaller pool shot overlapping it */}
        <div className="relative pb-[70px] from1000:pb-[90px]">
          <Pic ph={photo('interior-living')} className="aspect-[4/5] w-[78%]" />
          <Pic ph={photo('villa-bay')} className="absolute right-0 bottom-0 aspect-[4/3] w-[56%] shadow-[0_30px_70px_rgba(23,19,29,.25)] border-[6px] border-bg" />
        </div>
      </div>
      <dl className="m-0 mt-[72px] grid gap-[24px] grid-cols-2 from1000:grid-cols-4 [border-top:1px_solid_var(--color-line)] pt-[32px]">
        {figures.map(([n, l]) => (
          <div key={l} className="grid gap-[6px]">
            <dt className="font-display text-[clamp(44px,5vw,64px)] leading-none">{n}</dt>
            <dd className="m-0 text-[13.5px] text-muted max-w-[22ch]">{l}</dd>
          </div>
        ))}
      </dl>
    </Band>
  );
}
