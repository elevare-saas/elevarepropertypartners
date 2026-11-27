/* Properties → Add with AI: several properties at once. For each one staff add photos and their notes. Rent/sale,
   type, area, price and the ref code fill in from the notes as they type (lib/notesFacts.ts) and can be changed by
   hand; any left empty the AI reads from the notes (the price must be written there, it is never guessed).
   "Create drafts" uploads the photos and asks the AI for the rest, one property after another. Every result is a
   draft: hidden from the website until someone reviews and approves it. */
import {useEffect, useRef, useState} from 'react';
import {Alert, Badge, Btn, Card, Field, Input, Select, Sheet, Textarea} from '@/components/admin/kit';
import {AREAS, TYPES, type Mode, type PropType} from '@/concierge/data';
import {useLatest} from '@/hooks/useLatest';
import {useQuery} from '@/hooks/useQuery';
import {cx, digits, thb} from '@/lib/format';
import {errorMessage} from '@/lib/http';
import {factsFromNotes, refCodeInNotes} from '@/lib/notesFacts';
import {aiDraftsApi, listingsApi} from '@/services/listingsApi';
import type {AdminListing} from '@/types/admin';
import {MAX_PHOTOS} from './ListingEditor';

type Status = 'ready' | 'working' | 'done' | 'error';
interface Item {
  key: number;
  files: File[];
  /* object URLs for the thumbnails, same order as files */
  thumbs: string[];
  /* files already uploaded (so a retry doesn't upload them again): file → URL */
  uploaded: Map<File, string>;
  notes: string;
  /* the boxes: filled from the notes until someone changes one by hand; '' = the AI reads it from the notes */
  ref: string;
  mode: Mode | '';
  type: PropType | '';
  area: string;
  price: string;
  /* boxes someone set by hand (the notes no longer change them) */
  typed: ReadonlySet<Key>;
  /* boxes currently filled from the notes */
  fromNotes: ReadonlySet<Key>;
  /* what a box goes back to when the notes stop saying it: the previous card's choice */
  base: Pick<Item, 'mode' | 'type' | 'area'>;
  status: Status;
  step?: string;
  error?: string;
  listing?: AdminListing;
}

type Key = 'ref' | 'mode' | 'type' | 'area' | 'price';

let nextKey = 1;
const blank = (from?: Item): Item => {
  /* a new card starts like the previous one (a batch is often the same kind of property); the notes override it */
  const base = {mode: from?.mode ?? '', type: from?.type ?? '', area: from?.area ?? ''} as Item['base'];
  return {
    key: nextKey++,
    files: [],
    thumbs: [],
    uploaded: new Map(),
    notes: '',
    ref: '',
    ...base,
    price: '',
    typed: new Set(),
    fromNotes: new Set(),
    base,
    status: 'ready'
  };
};

/* the notes changed: refill every box nobody set by hand */
function withNotes(it: Item, notes: string): Item {
  const found = factsFromNotes(notes);
  const values: Record<Key, string | undefined> = {
    ref: refCodeInNotes(notes) || undefined,
    mode: found.mode,
    type: found.type,
    area: found.area,
    price: found.price ? String(found.price) : undefined
  };
  const next: Item = {...it, notes};
  const fromNotes = new Set<Key>();
  for (const k of Object.keys(values) as Key[]) {
    if (it.typed.has(k)) continue;
    const v = values[k];
    if (v) {
      (next as unknown as Record<Key, string>)[k] = v;
      fromNotes.add(k);
    } else if (it.fromNotes.has(k)) {
      /* the notes stopped saying it: back to the previous card's choice, or empty */
      (next as unknown as Record<Key, string>)[k] = k in it.base ? it.base[k as keyof Item['base']] : '';
    }
  }
  return {...next, fromNotes};
}
/* a box set by hand */
const byHand = (it: Item, k: Key, v: string): Partial<Item> => ({
  [k]: v,
  typed: new Set([...it.typed, k]),
  fromNotes: new Set([...it.fromNotes].filter(x => x !== k))
});

/* the hint under a box: where its value came from */
const source = (it: Item, k: Key, empty = 'AI reads it from the notes') =>
  it.fromNotes.has(k) ? 'From your notes' : it[k] ? undefined : empty;

const REF_CODE = /^[A-Z0-9][A-Z0-9._-]{0,29}$/;
const refOf = (it: Item) => it.ref.trim().toUpperCase();

/* what must be fixed before the AI can start, or '' (rent/sale, type, area and price may be left to the notes) */
function missing(it: Item, all: Item[], codes: ReadonlySet<string>) {
  const problems = [];
  if (!it.files.length) problems.push('Add photos.');
  if (it.price.trim() && !Number(digits(it.price))) problems.push('Price: numbers only, e.g. 70000.');
  if (!it.notes.trim() && !(it.mode && it.type && it.area && Number(digits(it.price))))
    problems.push('Write the notes, or fill in rent/sale, type, area and price.');
  const ref = refOf(it);
  if (ref && !REF_CODE.test(ref)) problems.push('Ref code: letters, numbers, dots or dashes only.');
  else if (ref && codes.has(ref)) problems.push(`Ref code ${ref} is already used by another property.`);
  else if (ref && all.some(x => x.key !== it.key && x.status !== 'done' && refOf(x) === ref))
    problems.push(`Ref code ${ref} is used twice in this batch.`);
  return problems.join(' ');
}

export default function AiDraftsSheet({
  existing,
  onClose,
  onCreated,
  onReview
}: {
  /* every property already in the dashboard, to catch a ref code that's taken before the AI runs */
  existing: AdminListing[];
  onClose: () => void;
  onCreated: (l: AdminListing) => void;
  onReview: (l: AdminListing) => void;
}) {
  const codes = new Set(existing.flatMap(l => (l.refCode ? [l.refCode.toUpperCase()] : [])));
  const status = useQuery('ai-drafts-status', aiDraftsApi.status);
  const [items, setItems] = useState<Item[]>(() => [blank()]);
  const [running, setRunning] = useState(false);
  const [tried, setTried] = useState(false);
  const stop = useRef(false);
  const maxImages = status.data?.maxImages ?? 8;

  const patch = (key: number, p: Partial<Item>) => setItems(xs => xs.map(x => (x.key === key ? {...x, ...p} : x)));

  /* free the thumbnails' memory when the sheet closes */
  const itemsRef = useLatest(items);
  useEffect(() => () => itemsRef.current.forEach(it => it.thumbs.forEach(URL.revokeObjectURL)), [itemsRef]);

  function addFiles(it: Item, picked: File[]) {
    const room = MAX_PHOTOS - it.files.length;
    const files = picked.filter(f => /^image\/(jpeg|png|webp)$/.test(f.type)).slice(0, room);
    patch(it.key, {files: [...it.files, ...files], thumbs: [...it.thumbs, ...files.map(f => URL.createObjectURL(f))]});
  }
  function removeFile(it: Item, i: number) {
    URL.revokeObjectURL(it.thumbs[i]);
    patch(it.key, {files: it.files.filter((_, j) => j !== i), thumbs: it.thumbs.filter((_, j) => j !== i)});
  }
  function makeCover(it: Item, i: number) {
    const order = (a: unknown[]) => [a[i], ...a.filter((_, j) => j !== i)];
    patch(it.key, {files: order(it.files) as File[], thumbs: order(it.thumbs) as string[]});
  }
  function removeItem(it: Item) {
    it.thumbs.forEach(URL.revokeObjectURL);
    setItems(xs => (xs.length > 1 ? xs.filter(x => x.key !== it.key) : [blank(it)]));
  }

  const todo = items.filter(it => it.status === 'ready' || it.status === 'error');
  const done = items.filter(it => it.status === 'done');

  async function createAll() {
    setTried(true);
    if (todo.some(it => missing(it, items, codes))) return;
    setRunning(true);
    stop.current = false;
    for (const it of todo) {
      if (stop.current) break;
      try {
        /* 1. upload the photos (full size, for the website), skipping ones a previous try uploaded */
        const urls: string[] = [];
        for (const [i, f] of it.files.entries()) {
          patch(it.key, {status: 'working', error: undefined, step: `Uploading photo ${i + 1} of ${it.files.length}…`});
          let url = it.uploaded.get(f);
          if (!url) {
            url = await listingsApi.uploadPhoto(f);
            it.uploaded.set(f, url);
          }
          urls.push(url);
        }
        /* 2. the AI looks at the first photos (the server loads them) and writes the listing */
        patch(it.key, {step: 'AI is writing the listing… (about 30 seconds)'});
        const listing = await aiDraftsApi.create({
          mode: it.mode || undefined,
          type: it.type || undefined,
          area: it.area || undefined,
          price: Number(digits(it.price)) || undefined,
          notes: it.notes.trim(),
          refCode: refOf(it),
          photos: urls
        });
        patch(it.key, {status: 'done', step: undefined, listing});
        onCreated(listing);
      } catch (e) {
        patch(it.key, {status: 'error', step: undefined, error: errorMessage(e)});
      }
    }
    setRunning(false);
  }

  const enabled = status.data?.enabled;
  return (
    <Sheet
      title="Add properties with AI"
      onClose={() => {
        if (!running || confirm('Drafts are still being created. Close anyway? The one in progress may be lost.')) {
          stop.current = true;
          onClose();
        }
      }}
      footer={
        <>
          {running && (
            <Btn kind="quiet" onClick={() => (stop.current = true)}>
              Stop after this one
            </Btn>
          )}
          <Btn onClick={onClose} disabled={running}>
            {done.length ? 'Done' : 'Cancel'}
          </Btn>
          {(running || todo.length > 0) && (
            <Btn kind="primary" disabled={running || !enabled} onClick={() => void createAll()}>
              {running ? 'Creating drafts…' : `Create ${todo.length > 1 ? `${todo.length} drafts` : 'draft'} with AI`}
            </Btn>
          )}
        </>
      }
    >
      <div className="grid gap-[16px]">
        {status.error && <Alert>{errorMessage(status.error)}</Alert>}
        {status.data && !enabled && (
          <Alert>
            The AI is not set up yet: the Claude API key (ANTHROPIC_API_KEY) still needs to be added to the server
            settings.
          </Alert>
        )}
        <p className="m-0 text-[13.5px] text-muted">
          For each property add photos and paste your notes: rent or sale, price, type, area and anything else you know.
          The boxes fill in from the notes; the AI writes the title, the descriptions, bedrooms, bathrooms, sizes and
          features. Each one is saved as a <b className="text-ink">draft</b>: nothing goes on the website until you
          review and approve it.
        </p>

        {items.map((it, n) => {
          const locked = running || it.status === 'working' || it.status === 'done';
          const why = tried && it.status !== 'done' ? missing(it, items, codes) : '';
          return (
            <Card key={it.key} className={cx('p-[14px] grid gap-[12px]', why && 'border-pink')}>
              <div className="flex items-center gap-[8px] flex-wrap">
                <b className="text-[15px]">Property {n + 1}</b>
                {it.status === 'working' && <Badge tone="violet">Working</Badge>}
                {it.status === 'done' && <Badge tone="good">Draft created</Badge>}
                {it.status === 'error' && <Badge tone="pink">Not created</Badge>}
                {!locked && (
                  <Btn size="sm" kind="quiet" className="ml-auto" onClick={() => removeItem(it)}>
                    Remove
                  </Btn>
                )}
              </div>

              {it.status === 'done' && it.listing ? (
                <div className="flex items-center gap-[10px] flex-wrap text-[13.5px]">
                  <span className="font-mono text-[12px] bg-surface-2 border border-line rounded-[6px] py-[1px] px-[6px]">
                    {it.listing.refCode}
                  </span>
                  <span className="min-w-0 flex-1">{it.listing.name}</span>
                  <Btn size="sm" kind="primary" onClick={() => onReview(it.listing!)}>
                    Review
                  </Btn>
                </div>
              ) : (
                <fieldset disabled={locked} className="border-0 p-0 m-0 grid gap-[12px] min-w-0">
                  <div className="grid gap-[8px]">
                    <span className="text-[12px] text-muted font-semibold">
                      Photos{' '}
                      <span className="font-normal text-faint">
                        ({it.files.length} of {MAX_PHOTOS}; the first is the cover; the AI looks at the first{' '}
                        {maxImages})
                      </span>
                    </span>
                    <div className="flex flex-wrap gap-[8px]">
                      {it.thumbs.map((src, i) => (
                        <span key={src} className="relative">
                          <img
                            src={src}
                            alt={`Photo ${i + 1}`}
                            className={cx(
                              'w-[84px] h-[64px] object-cover rounded-[8px] border',
                              i === 0 ? 'border-pink' : 'border-line'
                            )}
                          />
                          {!locked && (
                            <span className="absolute inset-x-0 bottom-0 flex justify-between p-[2px]">
                              {i > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => makeCover(it, i)}
                                  className="text-[10px] bg-[rgba(5,4,9,.8)] text-white rounded px-[4px] cursor-pointer border-0"
                                >
                                  Make cover
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold bg-pink text-white rounded px-[4px]">Cover</span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(it, i)}
                                aria-label={`Remove photo ${i + 1}`}
                                className="text-[10px] bg-[rgba(5,4,9,.8)] text-white rounded px-[5px] cursor-pointer border-0"
                              >
                                ✕
                              </button>
                            </span>
                          )}
                        </span>
                      ))}
                      {it.files.length < MAX_PHOTOS && (
                        <label className="w-[84px] h-[64px] grid place-items-center rounded-[8px] border border-dashed border-line text-[12px] text-muted cursor-pointer hover:border-violet text-center">
                          + Photos
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            hidden
                            onChange={e => {
                              addFiles(it, [...(e.target.files ?? [])]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <Field
                    label="Notes for the AI"
                    hint="Paste or write everything you know: ref code, rent or sale, price, type, area, rooms, sizes, view, furniture, ownership, what's nearby. Note form or Thai is fine."
                  >
                    <Textarea
                      rows={6}
                      maxLength={5000}
                      value={it.notes}
                      onChange={e => setItems(xs => xs.map(x => (x.key === it.key ? withNotes(x, e.target.value) : x)))}
                      placeholder={
                        'Ref: ELV-085\nFor rent: 70,000 THB/month\n3-bed pool villa in Kata, 3 bath, 280 sqm built (220 sqm living) on 600 sqm land\nSea view, fully furnished, 5 min to Kata beach'
                      }
                    />
                  </Field>

                  <div className="grid gap-[6px]">
                    <span className="text-[12px] text-muted">
                      These fill in from your notes. Check them, or leave one empty and the AI reads it from the notes.
                    </span>
                    <div className="grid grid-cols-5 upto760:grid-cols-3 upto600:grid-cols-2 gap-[10px]">
                      <Field label="Ref code" hint={source(it, 'ref', 'Empty = next ELV code')}>
                        <Input
                          value={it.ref}
                          onChange={e => patch(it.key, byHand(it, 'ref', e.target.value.toUpperCase()))}
                          placeholder="Auto"
                          maxLength={30}
                          className="font-mono"
                          aria-label="Reference code"
                        />
                      </Field>
                      <Field label="Rent or sale" hint={source(it, 'mode')}>
                        <Select
                          value={it.mode}
                          onChange={e => patch(it.key, byHand(it, 'mode', e.target.value))}
                          aria-label="Rent or sale"
                        >
                          <option value="">From notes</option>
                          <option value="rent">For rent</option>
                          <option value="buy">For sale</option>
                        </Select>
                      </Field>
                      <Field label="Type" hint={source(it, 'type')}>
                        <Select
                          value={it.type}
                          onChange={e => patch(it.key, byHand(it, 'type', e.target.value))}
                          aria-label="Type"
                        >
                          <option value="">From notes</option>
                          {Object.entries(TYPES).map(([k, l]) => (
                            <option key={k} value={k}>
                              {l}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Area" hint={source(it, 'area')}>
                        <Select
                          value={it.area}
                          onChange={e => patch(it.key, byHand(it, 'area', e.target.value))}
                          aria-label="Area"
                        >
                          <option value="">From notes</option>
                          {AREAS.map(a => (
                            <option key={a.k}>{a.k}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        label={
                          it.mode === 'buy' ? 'Price (THB)' : it.mode === 'rent' ? 'Rent / month (THB)' : 'Price (THB)'
                        }
                        hint={
                          Number(digits(it.price))
                            ? `${thb(Number(digits(it.price)))}${it.fromNotes.has('price') ? ' · from your notes' : ''}`
                            : 'AI reads it from the notes'
                        }
                      >
                        <Input
                          inputMode="numeric"
                          value={it.price}
                          onChange={e => patch(it.key, byHand(it, 'price', e.target.value))}
                          placeholder="From notes"
                          aria-label="Price"
                        />
                      </Field>
                    </div>
                  </div>
                </fieldset>
              )}

              {it.step && <div className="text-[13px] text-violet">{it.step}</div>}
              {it.error && <Alert>{it.error}</Alert>}
              {why && <div className="text-[12.5px] text-pink">{why}</div>}
            </Card>
          );
        })}

        {!running && (
          <Btn onClick={() => setItems(xs => [...xs, blank(xs[xs.length - 1])])}>+ Add another property</Btn>
        )}
      </div>
    </Sheet>
  );
}
