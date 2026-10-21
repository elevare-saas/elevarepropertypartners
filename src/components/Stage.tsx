import {cur} from '../concierge/store';
import {Area, Budget, Confirm, Mode, Must, Property, Timing, Vibe, Who} from './Quiz';
import {Book, Match, Matching, Send} from './Results';

const SCREENS = {
  mode: Mode, who: Who, vibe: Vibe, area: Area, property: Property, timing: Timing,
  budget: Budget, must: Must, confirm: Confirm, matching: Matching, match: Match, book: Book, send: Send
};

/* the current quiz or results step (the landing page is rendered by App); App remounts it on every full render so the entry animation replays like the original */
export default function Stage() {
  const Screen = SCREENS[cur];
  return <Screen />;
}
