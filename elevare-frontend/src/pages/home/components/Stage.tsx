import {hasHomes} from '@/concierge/data';
import {S, cur} from '@/concierge/store';
import {Area, Budget, Confirm, Mode, Must, Property, Timing, Vibe, Who} from './Quiz';
import {Book, Match, Matching, Send} from './Results';

const SCREENS = {
  mode: Mode,
  who: Who,
  vibe: Vibe,
  area: Area,
  property: Property,
  timing: Timing,
  budget: Budget,
  must: Must,
  confirm: Confirm,
  matching: Matching,
  match: Match,
  book: Book,
  send: Send
};

/* HomePage remounts this on every full render, so the entry animation replays */
export default function Stage() {
  /* safety net: past "rent or buy", the chosen mode must have homes, else ask again (it explains why) */
  const Screen = cur !== 'mode' && !hasHomes(S.mode || 'rent') ? Mode : SCREENS[cur as keyof typeof SCREENS];
  return <Screen />;
}
