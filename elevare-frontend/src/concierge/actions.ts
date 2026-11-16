import {applyPersona, applyVibe, autoNext, go, nextOf, parseAsk, refinements} from './engine';
import {S, cur, fresh, render, requestScroll, setS, setTrail, update, type Step} from './store';
import {hasHomes, LISTINGS, type Listing, type Mode} from './data';
import {apiUrl} from '@/services/apiBase';

export const goTo = (step: string) => go(step as Step);
export function next() {
  S.done.add(cur);
  if (cur === 'confirm') S.pick = null;
  go(cur === 'book' ? 'send' : nextOf(cur));
}
/* a mode with no homes can't be matched: show the "rent or buy" step, which says so */
function unavailable(m: Mode | null) {
  if (m && hasHomes(m)) return false;
  if (S.mode && !hasHomes(S.mode)) {
    S.mode = null;
    S.done.delete('mode');
  }
  if (cur === 'mode') render();
  else go('mode');
  return true;
}
export function chooseMode(m: Mode) {
  if (unavailable(m)) return;
  if (S.mode !== m) {
    S.who = null;
    S.vibe = null;
    S.done.delete('who');
    S.done.delete('vibe');
    S.pick = null;
    S.view = 'viewing';
  }
  S.mode = m;
  if (cur === 'welcome') {
    S.done.add('mode');
    go('who');
  } else {
    render();
    autoNext('mode');
  }
}
/* area tiles: start the journey with the area already chosen (renting if the area has rentals) */
export function startInArea(area: string) {
  const m: Mode = LISTINGS.some(l => l.area === area && l.mode === 'rent') ? 'rent' : 'buy';
  chooseMode(m);
  if (S.mode !== m) return;
  S.area = area;
  S.done.add('area');
  render();
}
export function chooseWho(k: string) {
  if (S.mode === 'buy') S.who = k;
  else if (S.who !== k) applyPersona(k);
  render();
  autoNext('who');
}
export function chooseVibe(v: string) {
  applyVibe(v);
  render();
  autoNext('vibe');
}
export function chooseArea(a: string) {
  S.area = a;
  S.pick = null;
  render();
  autoNext('area');
}
export function setType(t: string) {
  S.type = t;
  S.done.add('property');
  render();
}
export function setOwn(o: string) {
  S.own = o;
  render();
}
export function stepBeds(d: number) {
  S.beds = Math.min(6, Math.max(1, S.beds + d));
  S.done.add('property');
  render();
}
export function setTimeline(t: string) {
  S.timeline = t;
  render();
  autoNext('timing');
}
export function setMoveIn(k: number) {
  S.moveIn = k;
  render();
}
export function setLease(k: number) {
  S.lease = k;
  render();
}
export function setBudgetTier(v: number) {
  S.budget[S.mode || 'rent'] = v;
  render();
  autoNext('budget');
}
export function slideBudget(v: number) {
  S.budget[S.mode || 'rent'] = v;
  S.done.add('budget');
  update();
}
export function toggleMust(k: string) {
  if (S.must.has(k)) S.must.delete(k);
  else S.must.add(k);
  update();
}
export function togglePeek() {
  S.peek = !S.peek;
  update();
}
export async function preview(id: string) {
  const result = await refreshListing(id);
  if (result !== 'ok') {
    explain(result);
    return render();
  }
  S.pick = id;
  S.peek = false;
  go('match');
}
export function jumpToMatches() {
  S.pick = null;
  S.peek = false;
  go('match');
}
function browse(m: Mode, area?: string, pick?: string) {
  if (unavailable(m)) return;
  const name = S.name;
  setS(fresh());
  S.name = name;
  S.mode = m;
  S.done.add('mode');
  S.must = new Set();
  if (area) {
    S.area = area;
    S.done.add('area');
  }
  if (pick) S.pick = pick;
  go('match');
}
/* landing shortcuts: open a listing, or start with "who" answered */
/* Showing a property always asks the database for its latest details first (GET /api/listings/:id) and replaces
   the copy loaded with the page, so the view, comparisons and booking match the database now.
   'gone': unpublished or deleted since the page loaded · 'offline': the API could not be reached */
type Fresh = 'ok' | 'gone' | 'offline';
async function refreshListing(id: string): Promise<Fresh> {
  try {
    const r = await fetch(apiUrl(`/api/listings/${encodeURIComponent(id)}`), {cache: 'no-store'});
    const i = LISTINGS.findIndex(x => x.id === id);
    if (r.status === 404) {
      if (i >= 0) LISTINGS.splice(i, 1);
      return 'gone';
    }
    if (!r.ok) return 'offline';
    const {listing} = (await r.json()) as {listing: Listing};
    if (i >= 0) LISTINGS[i] = listing;
    else LISTINGS.push(listing);
    return 'ok';
  } catch {
    return 'offline';
  }
}
const explain = (result: Fresh) => {
  if (result === 'gone') alert('This home is no longer available. It may have been rented or sold.');
  if (result === 'offline') explain(result);
};

export async function fetchAndOpenListing(id: string): Promise<Fresh> {
  const result = await refreshListing(id);
  if (result === 'ok') browse(LISTINGS.find(x => x.id === id)!.mode, undefined, id);
  return result;
}

/* for clicks on the page: a removed property opens its "no longer available" page, a failed request says so */
export async function openListing(id: string) {
  const result = await fetchAndOpenListing(id);
  if (result === 'gone') location.assign(`/properties/home-${encodeURIComponent(id)}`);
  if (result === 'offline') explain(result);
}
export const startQuiz = () => go('mode');
export function skip() {
  if (cur === 'area') {
    S.area = 'any';
    S.done.add('area');
  }
  if (cur === 'property') {
    S.type = 'any';
    S.done.delete('property');
  }
  if (cur === 'budget') S.done.delete('budget');
  go(nextOf(cur));
}
export function toggleSave(id: string) {
  if (S.saved.has(id)) S.saved.delete(id);
  else S.saved.add(id);
  const y = window.scrollY;
  render();
  requestScroll(y);
}
export function toggleCmp(id: string) {
  if (S.cmp.has(id)) S.cmp.delete(id);
  else {
    if (S.cmp.size >= 3) S.cmp.delete([...S.cmp][0]);
    S.cmp.add(id);
  }
  const y = window.scrollY;
  render();
  requestScroll(y);
}
export function clearCmp() {
  S.cmp.clear();
  render();
}
export function setSort(s: string) {
  S.sort = s;
  S.pick = null;
  render();
}
export function refine(id: string) {
  const r = refinements().find(x => x.id === id);
  if (r) {
    r.fn();
    S.pick = null;
    render();
  }
}
export async function pickHome(id: string) {
  const result = await refreshListing(id);
  if (result !== 'ok') {
    explain(result);
    return render();
  }
  S.pick = id;
  render();
  requestScroll(0);
}
export function setView(v: string) {
  S.view = v;
  render();
}
export function setDay(d: number) {
  S.day = d;
  render();
}
export function setTime(t: string) {
  S.time = t;
  render();
}
export function setName(v: string) {
  S.name = v.trim().slice(0, 40);
}
export function restart() {
  const name = S.name;
  setS(fresh());
  S.name = name;
  setTrail([]);
  try {
    localStorage.removeItem('elevare_ask3');
  } catch {
    /* ignore */
  }
  go('welcome', false);
}
/* "Match me": parse the free text into a brief, then jump to the first gap */
export function askGo(text: string) {
  const txt = text.trim();
  if (!txt) {
    if (unavailable('rent')) return;
    S.mode = 'rent';
    S.done.add('mode');
    go('who');
    return;
  }
  const name = S.name;
  setS(fresh());
  S.name = name;
  parseAsk(txt);
  if (unavailable(S.mode)) return;
  if (!S.must.size && !S.who) S.must.add(S.type === 'condo' ? 'gym' : 'pool');
  if (S.mode === 'rent' && S.who && !S.vibe && S.who !== 'friends') S.done.add('vibe');
  const gap = (['who', 'area'] as Step[]).find(k => !S.done.has(k));
  ['mode', 'property', 'timing', 'budget', 'must'].forEach(k => S.done.add(k));
  go(gap || 'confirm');
}
