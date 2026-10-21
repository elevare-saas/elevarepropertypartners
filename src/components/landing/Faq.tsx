import {FAQ} from '../../concierge/content';
import {photo} from '../../concierge/photos';
import {Band, Heading, Pic} from './parts';

export default function Faq() {
  return (
    <Band id="faq" tone="paper" label="faq-h" className="pt-[8px] pb-[104px] upto600:pb-[72px]">
      <div className="grid gap-[40px] from1000:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] items-start">
        <div className="grid gap-[24px] from1000:sticky from1000:top-[96px]">
          <Heading id="faq-h" kicker="Questions" title="Good to know." sub="The things people ask us most before they move, buy or let." />
          <Pic ph={photo('life-bang-tao')} className="aspect-[4/3] upto999:hidden" />
        </div>
        <div className="grid gap-[10px]">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group bg-surface border border-line rounded-[16px] open:shadow-[0_14px_40px_rgba(23,19,29,.08)]">
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer py-[18px] px-[20px] flex justify-between items-center gap-[12px] font-semibold text-[15.5px]">
                {q}<span aria-hidden="true" className="shrink-0 w-[28px] h-[28px] rounded-full border border-line grid place-items-center text-pink text-[18px] leading-none [transition:transform_.2s] group-open:rotate-45">+</span>
              </summary>
              <p className="m-0 px-[20px] pb-[18px] text-muted text-[14.5px] max-w-[62ch]">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </Band>
  );
}
