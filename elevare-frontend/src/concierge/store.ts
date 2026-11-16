import {useSyncExternalStore} from 'react';
import type {Mode} from './data';

export type Step =
  | 'welcome'
  | 'mode'
  | 'who'
  | 'vibe'
  | 'area'
  | 'property'
  | 'timing'
  | 'budget'
  | 'must'
  | 'confirm'
  | 'matching'
  | 'match'
  | 'book'
  | 'send';

export interface State {
  mode: Mode | null;
  who: string | null;
  vibe: string | null;
  people: number | null;
  area: string | null;
  type: string;
  beds: number;
  own: string;
  moveIn: number;
  lease: number;
  timeline: string;
  budget: {rent: number; buy: number};
  must: Set<string>;
  done: Set<string>;
  pick: string | null;
  view: string;
  day: number;
  time: string;
  name: string;
  note: string;
  msgEdited: boolean;
  msgDraft?: string;
  sent: string | null;
  saved: Set<string>;
  cmp: Set<string>;
  sort: string;
  peek: boolean;
}

export const fresh = (): State => ({
  mode: null,
  who: null,
  vibe: null,
  people: null,
  area: null,
  type: 'villa',
  beds: 2,
  own: 'any',
  moveIn: 1,
  lease: 12,
  timeline: '3m',
  budget: {rent: 60000, buy: 15000000},
  must: new Set(),
  done: new Set(),
  pick: null,
  view: 'viewing',
  day: 1,
  time: 'Afternoon 14:00',
  name: '',
  note: '',
  msgEdited: false,
  sent: null,
  saved: new Set(),
  cmp: new Set(),
  sort: 'best',
  peek: false
});

/* mutable app state like the demo's `S`, `cur`, `trail` (ES module live bindings) */
export let S: State = fresh();
export let cur: Step = 'welcome';
export let trail: Step[] = [];
export const setS = (x: State) => {
  S = x;
};
export const setCur = (x: Step) => {
  cur = x;
};
export const setTrail = (x: Step[]) => {
  trail = x;
};

/* render(): full re-render, the entry animation replays
   update(): partial refresh that keeps the screen mounted */
let version = 0;
export let stageKey = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export function update() {
  version++;
  listeners.forEach(l => l());
}
export function render() {
  stageKey++;
  update();
}
export const useStore = () => useSyncExternalStore(subscribe, () => version);

/* scroll requested by an action, applied after React commits */
let pendingScroll: {top: number; smooth: boolean} | null = null;
export const requestScroll = (top: number, smooth = false) => {
  pendingScroll = {top, smooth};
};
export const takeScroll = () => {
  const s = pendingScroll;
  pendingScroll = null;
  return s;
};
