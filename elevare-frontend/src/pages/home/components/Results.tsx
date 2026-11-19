import {useEffect, useRef, useState, type ReactNode} from 'react';
import {CONFIG, LISTINGS, PERSONAS, TYPES, type Listing} from '@/concierge/data';
import {
  addDays,
  big,
  ensurePick,
  buildMessage,
  calc,
  homes,
  lead,
  links,
  money,
  reasons,
  reduced,
  refCode,
  score,
  sorted,
  statusText,
  thb,
  today
} from '@/concierge/engine';
import {S, cur, render, setCur, setTrail, trail} from '@/concierge/store';
import {
  clearCmp,
  goTo,
  next,
  pickHome,
  restart,
  setDay,
  setName,
  setSort,
  setTime,
  setView,
  skip,
  toggleCmp,
  toggleSave
} from '@/concierge/actions';
import {
  Actions,
  Art,
  Box,
  Chip,
  Chips,
  Cta,
  eyebrow,
  Eyebrow,
  fieldLabel,
  Ghost,
  ghostClass,
  heartClass,
  hint,
  Next,
  num,
  Opt,
  Opts,
  Pair,
  Question,
  Say,
  Screen
} from './ui';
import {cx} from '@/lib/format';
import {WhatsAppIcon} from '@/components/site/SiteChrome';

export function Matching() {
  const steps = [
    `Checking ${S.beds}-bedroom ${S.type === 'any' ? 'homes' : TYPES[S.type].toLowerCase() + 's'} ${S.mode === 'buy' ? 'for sale' : 'to rent'}`,
    `Matching ${S.must.size} must-have${S.must.size === 1 ? '' : 's'}${S.who && S.mode !== 'buy' ? ` for ${PERSONAS[S.who].l.toLowerCase()} renters` : ''}`,
    `Comparing ${S.area && S.area !== 'any' ? S.area : 'Phuket'} ${S.mode === 'buy' ? 'prices per square metre' : 'monthly rents'}`,
    S.mode === 'buy' ? 'Estimating rental yield' : 'Adding what’s included'
  ];
  const [on, setOn] = useState(0);
  useEffect(() => {
    const gap = reduced() ? 80 : 380,
      n = steps.length;
    S.pick = null;
    const timers = steps.map((_, i) => setTimeout(() => setOn(x => Math.max(x, i + 1)), gap * (i + 1)));
    timers.push(
      setTimeout(
        () => {
          if (cur === 'matching') {
            setTrail(trail.filter(h => h !== 'matching'));
            setCur('match');
            if (trail[trail.length - 1] !== 'confirm') trail.push('confirm');
            render();
          }
        },
        gap * (n + 1) + 200
      )
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Screen className="py-[30px]">
      <Eyebrow>One moment{S.name ? ', ' + S.name : ''}</Eyebrow>
      <h2 className="text-[clamp(30px,6vw,46px)] mb-[6px]">Finding your {S.mode === 'buy' ? 'property' : 'place'}…</h2>
      <ul className="list-none p-0 mt-[22px] mx-0 mb-0 grid gap-[12px]">
        {steps.map((t, i) => (
          <li
            key={i}
            className={cx(
              "flex gap-[10px] items-center [transition:opacity_.3s] before:content-[''] before:w-[8px] before:h-[8px] before:rounded-full before:bg-grad",
              i < on ? 'opacity-100 text-ink' : 'opacity-25 text-muted'
            )}
          >
            {t}
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function CompareTable() {
  const hs = [...S.cmp].map(id => LISTINGS.find(p => p.id === id)).filter(Boolean) as Listing[],
    rent = S.mode !== 'buy';
  const rows: [string, (p: Listing) => string][] = [
    ['Price', p => money(p.price) + (rent ? '/mo' : '')],
    [
      'vs. area average',
      p => {
        const c = calc(p);
        return !c.known ? '—' : c.diff > 0 ? `${money(c.diff)} below` : 'at market';
      }
    ],
    ['Area', p => p.area],
    ['Type', p => `${p.beds}-bed ${TYPES[p.type].toLowerCase()}`],
    ['Bathrooms', p => (p.baths ? String(p.baths) : '—')],
    ['Size', p => (p.sqm ? p.sqm + ' m²' : '—')],
    ['Your must-haves', p => `${[...S.must].filter(m => p.am.includes(m)).length} of ${S.must.size}`],
    ['Match', p => score(p) + '%'],
    ...(rent
      ? ([['Included', (p: Listing) => p.ex.join(', ')]] as [string, (p: Listing) => string][])
      : ([
          ['Ownership', (p: Listing) => p.own ?? '—'],
          [
            'Est. yield',
            (p: Listing) => {
              const y = calc(p).yield;
              return y === undefined ? '—' : (y * 100).toFixed(1) + '%';
            }
          ]
        ] as [string, (p: Listing) => string][]))
  ];
  const cell = 'py-[8px] px-[10px] [border-top:1px_solid_var(--color-line)] text-left align-top';
  return (
    <div className="mt-[16px] bg-surface border border-line rounded-[14px] p-[14px]">
      <div className="flex justify-between gap-[12px] flex-wrap items-baseline mb-[8px]">
        <b className="text-[15px]">Side by side</b>
        <Ghost onClick={clearCmp}>Clear</Ghost>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse w-full min-w-[440px] text-[13px]">
          <thead>
            <tr>
              <th className="py-[8px] px-[10px] text-left align-top font-display text-[17px] font-semibold" />
              {hs.map(p => (
                <th
                  key={p.id}
                  className="py-[8px] px-[10px] text-left align-top font-display text-[17px] font-semibold"
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([l, f]) => (
              <tr key={l}>
                <th className={cx(cell, 'text-muted font-medium whitespace-nowrap')}>{l}</th>
                {hs.map(p => (
                  <td key={p.id} className={cx(cell, 'tabular-nums')}>
                    {f(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Heart = ({id}: {id: string}) => (
  <button
    type="button"
    className={heartClass}
    aria-pressed={S.saved.has(id)}
    aria-label={`${S.saved.has(id) ? 'Remove from' : 'Add to'} viewing list`}
    onClick={() => toggleSave(id)}
  >
    {S.saved.has(id) ? '♥ Saved' : '♡ Save'}
  </button>
);
const CmpBtn = ({id}: {id: string}) => (
  <button type="button" className={heartClass} aria-pressed={S.cmp.has(id)} onClick={() => toggleCmp(id)}>
    {S.cmp.has(id) ? '✓ Comparing' : 'Compare'}
  </button>
);
const RowActions = ({id}: {id: string}) => (
  <div className="flex gap-[8px] flex-wrap">
    <Heart id={id} />
    <CmpBtn id={id} />
  </div>
);

const barLabel = 'text-[13px]';
function Bar({
  label,
  value,
  width,
  us,
  gradFill
}: {
  label: ReactNode;
  value: string;
  width: number;
  us?: boolean;
  gradFill?: boolean;
}) {
  return (
    <div className={cx('grid grid-cols-[minmax(0,1fr)_auto] gap-y-[4px] gap-x-[12px]', barLabel)}>
      <span className={cx(us && 'font-bold')}>{label}</span>
      <span className={num}>{value}</span>
      <div className="col-[1/-1] h-[12px] rounded-[6px]">
        <div
          className={cx('h-full rounded-[6px] [transition:width_.6s_ease]', us || gradFill ? 'bg-grad' : 'bg-bar')}
          style={{width: `${width}%`}}
        />
      </div>
    </div>
  );
}
const fitsList = 'list-none m-0 p-0 flex flex-wrap gap-y-[6px] gap-x-[14px] text-[13px]';
const fitLi = "before:content-['✓_'] before:text-good before:font-bold";
const missLi = "text-muted before:content-['◌_'] before:text-muted before:font-bold";

export function Match() {
  const list = sorted(),
    fitN = list.filter(x => x.fit).length;
  ensurePick(list);
  const top = list.find(x => x.p.id === S.pick)!,
    p = top.p,
    c = calc(p),
    rent = p.mode === 'rent',
    why = reasons(p);
  const others = list.filter(x => x.p.id !== S.pick).slice(0, 8);
  const extras = 'text-[13px] flex flex-wrap gap-y-[6px] gap-x-[14px]';
  const compareH = 'flex justify-between gap-[12px] flex-wrap items-baseline';
  return (
    <Screen>
      <Say step="match" />
      <div className="flex flex-wrap justify-between items-center gap-[10px] mb-[14px]">
        <span className={eyebrow}>
          {fitN} of {list.length} fit your brief · sort by
        </span>
        <Chips>
          <Chip pressed={S.sort === 'best'} onClick={() => setSort('best')}>
            Best match
          </Chip>
          <Chip pressed={S.sort === 'price'} onClick={() => setSort('price')}>
            Lowest price
          </Chip>
          <Chip pressed={S.sort === 'value'} onClick={() => setSort('value')}>
            Most below market
          </Chip>
        </Chips>
      </div>

      <article className="rounded-[18px] overflow-hidden bg-surface border border-line">
        <div className="aspect-[16/8] max-w-full relative">
          <Art p={p} />
          <span className="absolute top-[12px] left-[12px] bg-[rgba(5,4,9,.75)] text-white rounded-full py-[5px] px-[12px] text-[12px] font-bold backdrop-blur-[4px]">
            {top.s}% match
          </span>
        </div>
        <div className="pt-[18px] px-[20px] pb-[20px] grid gap-[14px]">
          <div className="flex justify-between items-end gap-[12px] flex-wrap">
            <div>
              <h2 className="text-[34px]">{p.name}</h2>
              <div className="text-muted text-[13px] mt-[4px]">
                {p.area} · {TYPES[p.type]} · {p.beds} bedroom{p.beds > 1 ? 's' : ''}
                {p.baths ? ` · ${p.baths} bathroom${p.baths > 1 ? 's' : ''}` : ''}
                {p.sqm ? ` · ${p.sqm} m²` : ''}
                {p.land ? ` · ${p.land} m² land` : ''}
              </div>
            </div>
            <div className="text-right upto520:text-left">
              <span className={cx('text-[24px]', num)}>{money(p.price)}</span>
              <small className="block text-muted text-[12px]">{rent ? 'per month' : 'asking price'}</small>
            </div>
          </div>
          <p className="m-0 text-muted">{p.line}</p>
          <div>
            <b className="block text-[14px] mb-[6px]">Why it suits you</b>
            <ul className={fitsList}>
              {why.r.map(x => (
                <li key={x} className={fitLi}>
                  {x}
                </li>
              ))}
              {why.miss.map(x => (
                <li key={'m' + x} className={missLi}>
                  Ask us about: {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-surface-2 rounded-[14px] p-[16px] grid gap-[12px]">
            {rent ? (
              <>
                <div className={compareH}>
                  <b className="text-[15px]">Monthly rent vs. {p.area} market</b>
                  <span className="font-bold text-good">
                    {c.diff > 0 ? `${thb(c.diff)} / month below market` : 'At market rate'}
                  </span>
                </div>
                <Bar
                  label={`Average asking rent, similar ${p.beds}-bed ${TYPES[p.type].toLowerCase()}s in ${p.area}`}
                  value={thb(c.m)}
                  width={100}
                />
                <Bar
                  us
                  label={`${p.name} with Elevare`}
                  value={thb(p.price)}
                  width={Math.min(100, (100 * p.price) / c.m)}
                />
                <div className={extras}>
                  <span>
                    {c.diff > 0 ? (
                      <>
                        Over {S.lease} month{S.lease > 1 ? 's' : ''} you keep <b className={num}>{thb(c.lease!)}</b>
                        .{' '}
                      </>
                    ) : (
                      ''
                    )}
                    Included:
                  </span>
                  {p.ex.map(e => (
                    <span key={e}>✓ {e}</span>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* the market comparison needs a floor area; without one the asking price stands alone */}
                {c.known ? (
                  <>
                    <div className={compareH}>
                      <b className="text-[15px]">Price vs. {p.area} market</b>
                      <span className="font-bold text-good">
                        {c.diff > 0 ? `${big(c.diff)} below market (${c.pct}%)` : 'At market value'}
                      </span>
                    </div>
                    <Bar
                      label={`Market value of similar ${TYPES[p.type].toLowerCase()}s, ${p.sqm} m² at ${thb(c.sqmM!)}/m²`}
                      value={big(c.m)}
                      width={100}
                    />
                    <Bar
                      us
                      label={`${p.name}, ${thb(c.sqmP!)}/m²`}
                      value={big(p.price)}
                      width={Math.min(100, (100 * p.price) / c.m)}
                    />
                  </>
                ) : (
                  <div className={compareH}>
                    <b className="text-[15px]">Asking price</b>
                    <span className="font-bold">{big(p.price)}</span>
                  </div>
                )}
                {c.yield !== undefined && (
                  <Bar
                    gradFill
                    label={
                      <>
                        Estimated gross rental yield: <b>{(c.yield * 100).toFixed(1)}%</b> vs. about{' '}
                        {(CONFIG.avgYield * 100).toFixed(1)}% typical
                      </>
                    }
                    value={`${thb(p.rent!)}/mo`}
                    width={Math.min(100, (100 * c.yield) / 0.08)}
                  />
                )}
                <div className={extras}>
                  {p.own && <span>{p.own}.</span>}
                  {p.ex.map(e => (
                    <span key={e}>✓ {e}</span>
                  ))}
                </div>
              </>
            )}
            <p className="text-[11.5px] text-faint m-0">
              {CONFIG.marketNote} {p.area}, {p.beds}-bedroom {TYPES[p.type].toLowerCase()}.
            </p>
          </div>
          <RowActions id={p.id} />
        </div>
      </article>

      {S.cmp.size >= 2 ? (
        <CompareTable />
      ) : S.cmp.size === 1 ? (
        <p className={cx(hint, 'mt-[14px]')}>Pick one more home to compare side by side.</p>
      ) : null}

      <Eyebrow className="mt-[24px]">
        {S.sort === 'best'
          ? 'More homes ranked for you'
          : 'All homes, ' + (S.sort === 'price' ? 'lowest price first' : 'best value first')}
      </Eyebrow>
      <div className="grid gap-[10px] mt-[10px]">
        {others.map(x => {
          const w = reasons(x.p);
          return (
            <div
              key={x.p.id}
              className={cx(
                'border border-line bg-surface rounded-[14px] py-[10px] px-[12px] grid gap-[10px]',
                !x.fit && 'opacity-[.62]'
              )}
            >
              <button
                type="button"
                onClick={() => pickHome(x.p.id)}
                className="grid grid-cols-[72px_minmax(0,1fr)_auto] gap-[12px] items-center text-left bg-transparent border-0 p-0 cursor-pointer w-full"
              >
                <span className="block w-[72px] h-[54px] rounded-[7px] overflow-hidden">
                  <Art p={x.p} k="r" />
                </span>
                <span>
                  <b className="block text-[15px]">{x.p.name}</b>
                  <small className="block text-muted text-[12.5px]">
                    {x.p.area} · {x.p.beds} bed {TYPES[x.p.type].toLowerCase()} ·{' '}
                    <span className={num}>{money(x.p.price)}</span>
                    {rent ? '/mo' : ''}
                  </small>
                  <small className="block text-ink text-[12.5px] mt-[2px]">
                    {x.fit
                      ? '✓ ' + (w.r[0] || 'Fits your brief')
                      : 'Outside your brief: ' + (w.miss[0] || 'different area')}
                  </small>
                </span>
                <span className="text-[12px] font-bold text-pink">{x.s}%</span>
              </button>
              <RowActions id={x.p.id} />
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-[calc(8px+env(safe-area-inset-bottom,0px))] mt-[18px] flex justify-between items-center gap-[10px] flex-wrap bg-[rgba(17,14,24,.94)] backdrop-blur-[8px] border border-line rounded-[16px] py-[10px] px-[12px] z-[5] text-[13px] text-muted">
        <span>
          {S.saved.size ? (
            <>
              <b className="text-ink">{S.saved.size}</b> saved for viewing
            </>
          ) : (
            'Save homes to view them in one trip'
          )}
        </span>
        <Cta size="dock" onClick={() => goTo('book')}>
          {S.saved.size > 1 ? `Plan a viewing tour (${S.saved.size}) →` : 'Arrange a viewing →'}
        </Cta>
      </div>
      <Actions>
        <Ghost onClick={() => goTo('confirm')}>Refine my brief</Ghost>
        <span />
      </Actions>
    </Screen>
  );
}

export function Book() {
  const hs = homes(),
    p = hs[0],
    days = [1, 2, 3, 4, 5].map(i => addDays(today, i)),
    rent = p.mode === 'rent',
    tour = hs.length > 1;
  const views: [string, string, string][] = [
    ['viewing', 'Visit in person', 'Walk through with an Elevare advisor'],
    ['video', 'Live video walkthrough', 'From wherever you are, about 15 minutes'],
    rent
      ? ['hold', 'Reserve it for me', 'We confirm availability and the lease terms']
      : ['details', 'Send me the full details', 'Floor plan, title documents and costs']
  ];
  return (
    <Screen>
      <Say step="book" />
      <Question
        title={tour ? `Your viewing tour: ${hs.length} homes` : `See ${p.name} first`}
        sub={
          <>
            {tour
              ? `We’ll line them up back to back${hs.every(h => h.area === p.area) ? ` in ${p.area}` : ''}, about 30 minutes each. `
              : ''}
            {rent ? 'No deposit until you’ve seen it and you’re happy.' : 'No commitment. Viewings are free.'}
          </>
        }
      />
      {tour ? (
        <ul className={cx(fitsList, 'mb-[14px]')}>
          {hs.map(h => (
            <li key={h.id} className={fitLi}>
              {h.name}, {h.area} · {money(h.price)}
              {rent ? '/mo' : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p className={cx(hint, 'mt-[-12px]')}>
          Tip: save more homes on the previous screen to see them all in one trip.
        </p>
      )}
      <Opts>
        {views.map(([k, l, d]) => (
          <Opt key={k} pressed={S.view === k} title={l} desc={d} onClick={() => setView(k)} />
        ))}
      </Opts>
      {['viewing', 'video'].includes(S.view) && (
        <Pair className="mt-[12px]">
          <Box>
            <span className={fieldLabel}>Day</span>
            <Chips>
              {days.map((d, i) => (
                <Chip key={i} pressed={S.day === i + 1} onClick={() => setDay(i + 1)}>
                  {d.toLocaleDateString('en-GB', {weekday: 'short', day: 'numeric'})}
                </Chip>
              ))}
            </Chips>
          </Box>
          <Box>
            <span className={fieldLabel}>Time (Phuket)</span>
            <Chips>
              {['Morning 10:00', 'Afternoon 14:00', 'Evening 17:30'].map(t => (
                <Chip key={t} pressed={S.time === t} onClick={() => setTime(t)}>
                  {t}
                </Chip>
              ))}
            </Chips>
          </Box>
        </Pair>
      )}
      {!S.name && (
        <Box className="mt-[12px]">
          <label htmlFor="guestName" className={fieldLabel}>
            Your first name (optional)
          </label>
          <input
            type="text"
            id="guestName"
            defaultValue={S.name}
            autoComplete="given-name"
            placeholder="e.g. Sarah"
            onChange={e => setName(e.target.value)}
          />
        </Box>
      )}
      <Next label="Write my message" onNext={next} onSkip={skip} />
    </Screen>
  );
}

const btn =
  'flex items-center justify-center gap-[8px] rounded-[12px] py-[14px] px-[10px] font-bold no-underline cursor-pointer border';
const btnPlain = cx(btn, 'text-[14px] border-line bg-surface text-ink hover:border-muted');

export function Send() {
  const p = homes()[0];
  const [msg, setMsg] = useState(() => (S.msgEdited ? S.msgDraft || buildMessage() : buildMessage()));
  const [edited, setEdited] = useState(S.msgEdited);
  const [status, setStatus] = useState(S.sent ? statusText(S.sent) : '');
  const msgRef = useRef<HTMLTextAreaElement>(null);
  const l = links(msg);

  const send = (ch: string) => {
    S.sent = ch;
    lead(ch, msg);
    if (ch === 'copy') {
      const ta = msgRef.current!;
      try {
        navigator.clipboard.writeText(msg).then(
          () => setStatus(statusText('copy')),
          () => {
            ta.select();
            setStatus('Message selected. Use your device’s copy.');
          }
        );
      } catch {
        ta.select();
      }
    } else setStatus(statusText(ch));
  };

  return (
    <Screen>
      <Say step="send" />
      <Question
        title="Send it your way"
        sub="Edit anything you like. It already includes your brief in plain words, the property, the price and a reference code."
      />
      <div className="flex justify-between items-center mb-[6px]">
        <label className={eyebrow} htmlFor="msg">
          Your message
        </label>
        <button
          type="button"
          className={ghostClass}
          hidden={!edited}
          onClick={() => {
            S.msgEdited = false;
            S.msgDraft = '';
            render();
          }}
        >
          Rewrite from my answers
        </button>
      </div>
      <textarea
        ref={msgRef}
        id="msg"
        value={msg}
        className="w-full min-h-[230px] rounded-[12px] border border-line bg-surface py-[12px] px-[14px] text-[13.5px] leading-[1.5] resize-y"
        onChange={e => {
          S.msgEdited = true;
          S.msgDraft = e.target.value;
          setMsg(e.target.value);
          setEdited(true);
        }}
      />
      <div className="grid grid-cols-[3fr_1fr] gap-[8px] mt-[14px]">
        <a
          className={cx(btn, 'text-[15px] bg-wa border-wa text-wa-ink')}
          href={l.wa}
          target="_blank"
          rel="noopener"
          onClick={() => send('whatsapp')}
        >
          <WhatsAppIcon />
          Send on WhatsApp
        </a>
        <button type="button" className={btnPlain} onClick={() => send('copy')}>
          Copy
        </button>
      </div>
      <p className="text-[13px] min-h-[1.4em] mt-[10px] mx-0 mb-0 text-pink" role="status">
        {status}
      </p>
      <p className="text-[12.5px] text-faint mt-[14px] mx-0 mb-0">{l.contact}</p>
      <ol className="list-none mt-[22px] mx-0 mb-0 p-0 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[12px] upto600:grid-cols-[1fr]">
        {[
          [
            'Send the message',
            <>
              Ref {refCode()} tells us exactly which {homes().length > 1 ? 'homes and prices' : 'property and price'}{' '}
              you saw.
            </>
          ],
          ['We reply on WhatsApp', <>An Elevare advisor confirms availability {CONFIG.replyWindow}.</>],
          [
            'View, then decide',
            p.mode === 'rent'
              ? 'See it in person or on video before signing anything.'
              : 'View it, review the title documents, then make an offer.'
          ]
        ].map(([b, t], i) => (
          <li key={i} className="[border-top:1px_solid_var(--color-line)] pt-[10px] text-[13px] text-muted">
            <span className="block font-display text-[26px] leading-none grad-text">{i + 1}</span>
            <b className="text-ink block">{b}</b>
            {t}
          </li>
        ))}
      </ol>
      <Actions>
        <Ghost onClick={() => goTo('match')}>Back to my matches</Ghost>
        <Ghost onClick={restart}>Start a new search</Ghost>
      </Actions>
    </Screen>
  );
}
