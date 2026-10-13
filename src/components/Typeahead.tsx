import {useRef, useState, type KeyboardEvent, type RefObject} from 'react';
import {VOCAB} from '../concierge/engine';

type Item = {w: string; h: string};

/* word-level typeahead for the free-text boxes (welcome request and confirm note) */
export function useTypeahead(taRef: RefObject<HTMLTextAreaElement>, onAccepted: () => void) {
  const [items, setItemsState] = useState<Item[]>([]);
  const [sel, setSelState] = useState(-1);
  const itemsRef = useRef<Item[]>([]), selRef = useRef(-1);
  const setItems = (x: Item[]) => { itemsRef.current = x; setItemsState(x); };
  const setSel = (x: number) => { selRef.current = x; setSelState(x); };

  const hide = () => setItems([]);
  const show = () => {
    const ta = taRef.current, pre = ta.value.slice(0, ta.selectionStart), last = (pre.match(/(\S+)$/) || ['', ''])[1].toLowerCase();
    if (last.length < 2) return hide();
    const found = VOCAB.filter(x => x.w.toLowerCase().split(' ').some(p => p.startsWith(last)) && !pre.toLowerCase().includes(x.w.toLowerCase())).slice(0, 6);
    if (!found.length) return hide();
    setSel(0); setItems(found);
  };
  const accept = (i: number) => {
    const ta = taRef.current, list = itemsRef.current, pos = ta.selectionStart, pre = ta.value.slice(0, pos), post = ta.value.slice(pos), st = pre.search(/(\S+)$/), at = st < 0 ? pos : st;
    ta.value = pre.slice(0, at) + list[i].w + ' ' + post.replace(/^\S*/, '').trimStart();
    const c = at + list[i].w.length + 1; ta.setSelectionRange(c, c); hide();
    onAccepted();
  };
  const visible = items.length > 0;
  /* returns true when the key was handled by the suggestion list */
  const onKeyDown = (e: KeyboardEvent) => {
    if (!itemsRef.current.length) return false;
    const n = itemsRef.current.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setSel((selRef.current + (e.key === 'ArrowDown' ? 1 : -1) + n) % n); }
    else if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); accept(selRef.current); }
    else if (e.key === 'Escape') hide();
    return true;
  };
  const onBlur = () => setTimeout(hide, 120);

  const list = (
    <ul id="suggest" role="listbox" hidden={!visible}
      className="absolute left-[10px] right-[10px] top-[calc(100%-4px)] bg-surface-2 border border-line rounded-[10px] list-none m-0 p-[4px] z-20 shadow-[0_12px_30px_rgba(0,0,0,.5)]"
      onMouseDown={e => { const li = (e.target as HTMLElement).closest('li'); if (li) { e.preventDefault(); accept(+li.dataset.i); } }}>
      {items.map((x, i) => (
        <li key={x.w} role="option" data-i={i} aria-selected={i === sel}
          className="py-[8px] px-[10px] rounded-[7px] cursor-pointer text-[14px] flex justify-between gap-[10px] hover:bg-line aria-selected:bg-line">
          <span>{x.w}</span><small className="text-muted">{x.h}</small>
        </li>
      ))}
    </ul>
  );
  return {show, onKeyDown, onBlur, list};
}

export const askBoxClass = 'relative bg-surface border border-line rounded-[14px] py-[12px] px-[14px]';
export const askTextareaClass = 'w-full border-0 bg-transparent resize-none min-h-[52px] text-[16px] outline-none';
