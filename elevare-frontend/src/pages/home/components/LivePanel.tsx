import {insight, money, pool, ranked, total} from '@/concierge/engine';
import {S, cur, useStore} from '@/concierge/store';
import {jumpToMatches, preview, togglePeek} from '@/concierge/actions';
import {Art, eyebrow, ghostClass, hint, num} from './ui';
import {cx} from '@/lib/format';

export const liveVisible = () => !!S.mode && !['welcome', 'matching', 'match', 'book', 'send'].includes(cur);

/* sticky sidebar on desktop, bottom sheet on mobile */
export default function LivePanel() {
  const version = useStore();
  const show = liveVisible();
  if (!show) return <aside hidden aria-label="Live matches" />;
  const now = pool(),
    tot = total(),
    top = ranked()
      .filter(x => now.includes(x.p))
      .slice(0, 3),
    rent = S.mode !== 'buy';
  return (
    <aside
      aria-label="Live matches"
      className={cx(
        'bg-surface border border-line rounded-[16px] p-[14px]',
        'from1000:sticky from1000:top-[16px]',
        'upto999:fixed upto999:left-0 upto999:right-0 upto999:bottom-0 upto999:z-30 upto999:rounded-[16px_16px_0_0] upto999:border-b-0 upto999:pt-[10px] upto999:px-[16px] upto999:pb-[calc(10px+env(safe-area-inset-bottom,0px))] upto999:shadow-[0_-10px_30px_rgba(0,0,0,.5)] upto999:max-h-[75vh] upto999:overflow-auto'
      )}
    >
      {/* re-created on every refresh, so the bar jumps rather than animates */}
      <div key={version} className="contents">
        <button
          type="button"
          aria-expanded={S.peek}
          onClick={togglePeek}
          className="grid grid-cols-[1fr_auto] gap-y-[4px] gap-x-[12px] w-full text-left bg-transparent border-0 p-0 cursor-pointer from1000:cursor-default"
        >
          <span className={eyebrow}>Live matches</span>
          <span className="text-[13px] text-muted">
            <b className="font-display text-[30px] font-medium text-ink mr-[4px] tabular-nums">{now.length}</b> of {tot}{' '}
            {rent ? 'rentals' : 'properties'} fit
          </span>
          <span className="col-[1/-1] h-[3px] bg-line rounded-[3px] overflow-hidden">
            <i
              className="block h-full bg-grad [transition:width_.45s_ease]"
              style={{width: `${tot ? (100 * now.length) / tot : 0}%`}}
            />
          </span>
          <span className="col-[2] row-[1/3] self-center text-[13px] font-bold text-pink from1000:hidden">
            {S.peek ? 'Hide' : 'Peek'}
          </span>
        </button>
        <div className={cx('grid gap-[8px] mt-[12px]', !S.peek && 'upto999:hidden')}>
          {top.length ? (
            top.map(x => (
              <button
                key={x.p.id}
                type="button"
                onClick={() => preview(x.p.id)}
                className="grid grid-cols-[48px_minmax(0,1fr)_auto] gap-[10px] items-center text-left bg-surface-2 border border-line rounded-[10px] p-[6px] cursor-pointer hover:border-violet"
              >
                <span className="block w-[48px] h-[36px] rounded-[7px] overflow-hidden">
                  <Art p={x.p} k="l" />
                </span>
                <span>
                  <b className="block text-[13px] whitespace-nowrap overflow-hidden text-ellipsis">{x.p.name}</b>
                  <small className="text-muted text-[12px]">
                    {x.p.area} · <span className={num}>{money(x.p.price)}</span>
                    {rent ? '/mo' : ''}
                  </small>
                </span>
                <span className="text-[12px] font-bold text-pink">{x.s}%</span>
              </button>
            ))
          ) : (
            <p className={cx(hint, 'm-0')}>No homes fit every answer yet.</p>
          )}
          <p className="mt-[4px] mx-0 mb-0 text-[13px] leading-[1.45] bg-[rgba(122,63,224,.16)] border border-[rgba(122,63,224,.35)] rounded-[10px] py-[10px] px-[12px]">
            {insight()}
          </p>
          {now.length ? (
            <button type="button" className={ghostClass} onClick={jumpToMatches}>
              See all {now.length} now →
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
