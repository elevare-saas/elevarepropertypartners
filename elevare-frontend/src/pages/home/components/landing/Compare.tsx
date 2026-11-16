/* Elevare vs the big marketplaces (from the investor review), kept fair: every cell has a status and a few words,
   and the portals win where they really do (choice). Brand names are examples of each group, not claims about one. */
import mark from '@/assets/elevare-mark.png';
import {cx} from '@/lib/format';

type Status = 'yes' | 'part' | 'no';
type Cell = [Status, string];

const COLS = [
  {name: 'Elevare', note: 'Phuket property partner'},
  {name: 'Property portals', note: 'e.g. DDproperty, FazWaz, Hipflat'},
  {name: 'Holiday rental apps', note: 'e.g. Airbnb'}
];

const ROWS: [string, Cell, Cell, Cell][] = [
  [
    'Recommends homes for your needs',
    ['yes', 'A short list, with reasons'],
    ['no', 'You search and filter'],
    ['no', 'You search and filter']
  ],
  [
    'Every home checked before listing',
    ['yes', 'Owner, photos and prices'],
    ['part', 'Varies by listing'],
    ['part', 'Guest reviews']
  ],
  [
    'Holiday, long stay and purchase',
    ['yes', 'All three'],
    ['part', 'Long stays and sales'],
    ['part', 'Holidays only']
  ],
  [
    'One contact from start to finish',
    ['yes', 'One advisor on WhatsApp'],
    ['no', 'A different agent per home'],
    ['no', 'A different host per home']
  ],
  [
    'Help after you arrive',
    ['yes', 'Transfers, chefs, relocation'],
    ['no', 'Not offered'],
    ['part', 'Depends on the host']
  ],
  [
    'Widest choice of homes',
    ['part', 'A small, checked selection'],
    ['yes', 'The largest choice'],
    ['yes', 'Large, holidays only']
  ]
];

const LABEL: Record<Status, string> = {yes: 'Yes', part: 'Partly', no: 'No'};

function Mark({status}: {status: Status}) {
  return (
    <span
      role="img"
      aria-label={LABEL[status]}
      className={cx(
        'shrink-0 grid place-items-center w-[24px] h-[24px] rounded-full text-[12.5px] font-bold leading-none',
        status === 'yes' && 'bg-grad text-white shadow-[0_4px_14px_rgba(192,79,208,.35)]',
        status === 'part' && 'border border-[color:var(--color-bar)] text-muted',
        status === 'no' && 'bg-surface-2 text-faint'
      )}
    >
      {status === 'yes' ? '✓' : status === 'part' ? '~' : '✕'}
    </span>
  );
}

const Value = ({cell: [status, text]}: {cell: Cell}) => (
  <span className="flex items-center gap-[10px]">
    <Mark status={status} />
    <span className={cx('text-[14px] leading-snug', status === 'yes' ? 'text-ink' : 'text-muted')}>{text}</span>
  </span>
);

/* the Elevare column reads as one lifted card: tinted, pink edges (top on the header, bottom on the last row) */
const elevareBg = 'bg-[linear-gradient(180deg,rgba(122,63,224,.16),rgba(224,92,181,.10))]';
const EDGE = {
  head: 'shadow-[inset_1px_1px_0_rgba(224,92,181,.45),inset_-1px_0_0_rgba(224,92,181,.45)]',
  mid: 'shadow-[inset_1px_0_0_rgba(224,92,181,.45),inset_-1px_0_0_rgba(224,92,181,.45)]',
  last: 'shadow-[inset_1px_-1px_0_rgba(224,92,181,.45),inset_-1px_0_0_rgba(224,92,181,.45)]'
};

export default function Compare() {
  return (
    <div className="mt-[40px]">
      {/* phones: one card per question */}
      <ul className="from760:hidden list-none m-0 p-0 grid gap-[12px]">
        {ROWS.map(([q, ...cells]) => (
          <li key={q} className="rounded-[18px] border border-line bg-surface p-[16px] grid gap-[12px]">
            <b className="text-[15px]">{q}</b>
            {cells.map((c, i) => (
              <div
                key={i}
                className={cx(
                  'grid gap-[6px]',
                  i === 0 &&
                    'rounded-[12px] p-[12px] bg-[linear-gradient(135deg,rgba(122,63,224,.18),rgba(224,92,181,.12))] border border-[rgba(224,92,181,.35)]'
                )}
              >
                <span
                  className={cx(
                    'text-[11px] uppercase tracking-[.14em]',
                    i === 0 ? 'text-pink font-semibold' : 'text-faint'
                  )}
                >
                  {COLS[i].name}
                </span>
                <Value cell={c} />
              </div>
            ))}
          </li>
        ))}
      </ul>

      <div className="upto759:hidden rounded-[24px] border border-line bg-[linear-gradient(180deg,var(--color-surface),rgba(17,14,24,.6))] p-[10px] shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">Elevare compared with property portals and holiday rental apps</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[28%] p-[20px]">
                <span className="sr-only">Feature</span>
              </th>
              {COLS.map((c, i) => (
                <th
                  key={c.name}
                  scope="col"
                  className={cx(
                    'relative p-[20px] align-bottom',
                    i === 0 && cx(elevareBg, EDGE.head, 'rounded-t-[18px]')
                  )}
                >
                  {i === 0 && (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute top-0 left-[18px] right-[18px] h-[3px] rounded-b-full bg-[linear-gradient(90deg,#7a3fe0,#e05cb5,#55b6f2)]"
                      />
                      <span className="inline-block mb-[10px] rounded-full bg-grad text-white text-[10.5px] font-bold tracking-[.12em] uppercase py-[4px] px-[10px]">
                        Our approach
                      </span>
                    </>
                  )}
                  <span className="flex items-center gap-[8px]">
                    {i === 0 && <img src={mark} alt="" className="w-[22px] h-auto" />}
                    <b className={cx('text-[17px]', i === 0 ? 'text-ink' : 'text-muted')}>{c.name}</b>
                  </span>
                  <span className="block text-[12px] font-normal text-faint mt-[4px]">{c.note}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([q, ...cells], r) => {
              const last = r === ROWS.length - 1;
              return (
                <tr key={q} className="group">
                  <th
                    scope="row"
                    className="py-[18px] px-[20px] align-middle text-[14.5px] font-semibold text-ink [border-top:1px_solid_var(--color-line)] group-hover:bg-[rgba(255,255,255,.025)]"
                  >
                    {q}
                  </th>
                  {cells.map((c, i) => (
                    <td
                      key={i}
                      className={cx(
                        'py-[18px] px-[20px] align-middle [border-top:1px_solid_var(--color-line)]',
                        i === 0
                          ? cx(elevareBg, last ? cx(EDGE.last, 'rounded-b-[18px]') : EDGE.mid)
                          : 'group-hover:bg-[rgba(255,255,255,.025)]'
                      )}
                    >
                      <Value cell={c} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* the takeaway, on a soft Elevare glow */}
      <div className="relative mt-[64px] mb-[16px] overflow-hidden rounded-[28px] border border-line py-[64px] px-[24px] upto600:py-[44px] bg-[radial-gradient(60%_120%_at_20%_0%,rgba(122,63,224,.22),transparent_70%),radial-gradient(55%_120%_at_85%_100%,rgba(224,92,181,.18),transparent_70%),var(--color-surface)]">
        <span
          aria-hidden="true"
          className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-[linear-gradient(90deg,transparent,#7a3fe0,#e05cb5,#55b6f2,transparent)]"
        />
        <img
          src={mark}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-[-40px] bottom-[-50px] w-[220px] opacity-[.06] rotate-[-12deg] upto600:w-[150px]"
        />
        <p className="relative m-0 mx-auto text-center text-[clamp(18px,2vw,23px)] leading-[1.55] text-muted max-w-[56ch]">
          Use a portal when you want the widest choice.{' '}
          <span className="text-ink">
            Choose Elevare when you want a few checked homes that fit you, and one team from your holiday to your
            purchase.
          </span>
        </p>
      </div>
    </div>
  );
}
