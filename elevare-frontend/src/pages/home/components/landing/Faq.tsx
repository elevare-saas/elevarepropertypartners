import {FAQ} from '@/concierge/content';
import {whatsappUrl} from '@/lib/whatsapp';
import {WhatsAppIcon} from '@/components/site/SiteChrome';
import {Band, Heading} from './parts';

export default function Faq() {
  return (
    <Band id="faq" tone="paper" label="faq-h">
      <div className="grid gap-[32px] from1000:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)] items-start">
        <Heading id="faq-h" title="Questions" />
        <div className="grid">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group [border-bottom:1px_solid_var(--color-line)]">
              <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer py-[20px] flex justify-between items-center gap-[12px] font-semibold text-[16px]">
                {q}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-pink text-[22px] leading-none [transition:transform_.2s] group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="m-0 pb-[20px] text-muted text-[14.5px] max-w-[62ch]">{a}</p>
            </details>
          ))}
          <div className="mt-[28px] flex flex-wrap items-center gap-[14px]">
            <span className="text-muted text-[15px]">Still have a question?</span>
            <a
              href={whatsappUrl('Hi Elevare, I’m looking for a home in Phuket.')}
              target="_blank"
              rel="noopener"
              className="no-underline rounded-full py-[13px] px-[24px] font-semibold text-[14.5px] bg-wa text-wa-ink inline-flex items-center gap-[8px]"
            >
              <WhatsAppIcon />
              Chat with us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </Band>
  );
}
