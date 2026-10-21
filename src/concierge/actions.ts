/* User actions, ported from the demo's delegated click/input handlers */
import {applyPersona, applyVibe, autoNext, go, nextOf, parseAsk, refinements} from './engine';
import {S, cur, fresh, render, requestScroll, setS, setTrail, update, type Step} from './store';
import {LISTINGS, type Mode} from './data';

export const goTo = (step: string) => go(step as Step);
export function next(){ S.done.add(cur); if (cur==="confirm") S.pick=null; go(cur==="book"?"send":nextOf(cur)); }
export function chooseMode(m: Mode){
  if (S.mode!==m){ S.who=null; S.vibe=null; S.done.delete("who"); S.done.delete("vibe"); S.pick=null; S.view="viewing"; } S.mode=m;
  if (cur==="welcome"){ S.done.add("mode"); go("who"); } else { render(); autoNext("mode"); }
}
export function chooseWho(k: string){ if (S.mode==="buy") S.who=k; else if (S.who!==k) applyPersona(k); render(); autoNext("who"); }
export function chooseVibe(v: string){ applyVibe(v); render(); autoNext("vibe"); }
export function chooseArea(a: string){ S.area=a; S.pick=null; render(); autoNext("area"); }
export function setType(t: string){ S.type=t; S.done.add("property"); render(); }
export function setOwn(o: string){ S.own=o; render(); }
export function stepBeds(d: number){ S.beds=Math.min(6,Math.max(1,S.beds+d)); S.done.add("property"); render(); }
export function setTimeline(t: string){ S.timeline=t; render(); autoNext("timing"); }
export function setMoveIn(k: number){ S.moveIn=k; render(); }
export function setLease(k: number){ S.lease=k; render(); }
export function setBudgetTier(v: number){ S.budget[S.mode||"rent"]=v; render(); autoNext("budget"); }
export function slideBudget(v: number){ S.budget[S.mode||"rent"]=v; S.done.add("budget"); update(); }
export function toggleMust(k: string){ if (S.must.has(k)) S.must.delete(k); else S.must.add(k); update(); }
export function togglePeek(){ S.peek=!S.peek; update(); }
export function preview(id: string){ S.pick=id; S.peek=false; go("match"); }
export function jumpToMatches(){ S.pick=null; S.peek=false; go("match"); }
export function browse(m: Mode, area?: string, pick?: string){
  const name=S.name; setS(fresh()); S.name=name; S.mode=m; S.done.add("mode"); S.must=new Set();
  if (area){ S.area=area; S.done.add("area"); }
  if (pick) S.pick=pick;
  go("match");
}
/* landing shortcuts: open one listing, or start the questions with "who" already answered */
export function openListing(id: string){ const p=LISTINGS.find(x=>x.id===id); if (p) browse(p.mode,undefined,id); }
export function startAs(m: Mode, who: string){
  const name=S.name; setS(fresh()); S.name=name; S.mode=m; S.done.add("mode");
  if (m==="buy") S.who=who; else applyPersona(who);
  S.done.add("who"); setTrail(["welcome","mode","who"]); go(nextOf("who"),false);
}
export const startQuiz = () => go("mode");
export function skip(){
  if (cur==="area"){ S.area="any"; S.done.add("area"); }
  if (cur==="property"){ S.type="any"; S.done.delete("property"); }
  if (cur==="budget") S.done.delete("budget");
  go(nextOf(cur));
}
export function toggleSave(id: string){ if (S.saved.has(id)) S.saved.delete(id); else S.saved.add(id); const y=window.scrollY; render(); requestScroll(y); }
export function toggleCmp(id: string){
  if (S.cmp.has(id)) S.cmp.delete(id); else { if (S.cmp.size>=3) S.cmp.delete([...S.cmp][0]); S.cmp.add(id); }
  const y=window.scrollY; render(); requestScroll(y);
}
export function clearCmp(){ S.cmp.clear(); render(); }
export function setSort(s: string){ S.sort=s; S.pick=null; render(); }
export function refine(id: string){ const r=refinements().find(x=>x.id===id); if (r){ r.fn(); S.pick=null; render(); } }
export function pickHome(id: string){ S.pick=id; render(); requestScroll(0); }
export function setView(v: string){ S.view=v; render(); }
export function setDay(d: number){ S.day=d; render(); }
export function setTime(t: string){ S.time=t; render(); }
export function setName(v: string){ S.name=v.trim().slice(0,40); }
export function restart(){
  const name=S.name; setS(fresh()); S.name=name; setTrail([]);
  try { localStorage.removeItem("elevare_ask3"); } catch { /* ignore */ }
  go("welcome",false);
}
/* "Match me": turn the free-text request into a brief, then jump to the first gap */
export function askGo(text: string){
  const txt=text.trim(); if (!txt){ S.mode="rent"; S.done.add("mode"); go("who"); return; }
  const name=S.name; setS(fresh()); S.name=name; parseAsk(txt);
  if (!S.must.size && !S.who) S.must.add(S.type==="condo"?"gym":"pool");
  if (S.mode==="rent"&&S.who&&!S.vibe&&S.who!=="friends") S.done.add("vibe");
  const gap=(["who","area"] as Step[]).find(k=>!S.done.has(k));
  ["mode","property","timing","budget","must"].forEach(k=>S.done.add(k));
  go(gap||"confirm");
}
