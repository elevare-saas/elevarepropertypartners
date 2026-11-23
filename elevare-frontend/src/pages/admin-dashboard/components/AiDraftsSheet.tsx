/* Properties → Add with AI: several properties at once. For each one staff add photos, a few words of notes and the
   four facts the AI must not guess (rent/sale, type, area, price). "Create drafts" uploads the photos and asks the AI
   for the title, descriptions, rooms and features, one property after another. Every result is a draft: hidden from
   the website until someone reviews and approves it. */
import {useEffect, useRef, useState} from 'react';
import {Alert, Badge, Btn, Card, Field, Input, Select, Sheet, Textarea} from '@/components/admin/kit';
import {AREAS, TYPES, type Mode, type PropType} from '@/concierge/data';
import {useLatest} from '@/hooks/useLatest';
import {useQuery} from '@/hooks/useQuery';
import {cx, digits, thb} from '@/lib/format';
import {errorMessage} from '@/lib/http';
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
  mode: Mode;
  type: PropType;
  area: string;
  price: string;
  status: Status;
  step?: string;
  error?: string;
  listing?: AdminListing;
}

let nextKey = 1;
const blank = (from?: Item): Item => ({
  key: nextKey++,
  files: [],
  thumbs: [],
  uploaded: new Map(),
  notes: '',
  /* a new card starts like the previous one: a batch is usually the same kind of property */
  mode: from?.mode ?? 'rent',
  type: from?.type ?? 'villa',
  area: from?.area ?? '',
  price: '',
  status: 'ready'
});

/* what's missing before the AI can start, or '' */
function missing(it: Item) {
  const m = [];
  if (!it.files.length) m.push('photos');
  if (!it.area) m.push('area');
  if (!Number(digits(it.price))) m.push(it.mode === 'buy' ? 'sale price' : 'monthly rent');
  return m.length ? `Add ${m.join(', ')}.` : '';
}

export default function AiDraftsSheet({
  onClose,
  onCreated,
  onReview
}: {
  onClose: () => void;
  onCreated: (l: AdminListing) => void;
  onReview: (l: AdminListing) => void;
}) {
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
    if (todo.some(missing)) return;
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
        /* 2. the AI looks at small copies of the first photos and writes the listing */
        patch(it.key, {step: 'AI is writing the listing… (about 30 seconds)'});
        const images = await Promise.all(it.files.slice(0, maxImages).map(aiDraftsApi.preview));
        const listing = await aiDraftsApi.create({
          mode: it.mode,
          type: it.type,
          area: it.area,
          price: Number(digits(it.price)),
          notes: it.notes.trim(),
          photos: urls,
          images
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
          For each property add photos, a few words about it, and the price, area, rent or sale, and type. The AI writes
          the title, the descriptions, bedrooms, bathrooms and features. Each one is saved as a{' '}
          <b className="text-ink">draft</b>: nothing goes on the website until you review and approve it.
        </p>

        {items.map((it, n) => {
          const locked = running || it.status === 'working' || it.status === 'done';
          const why = tried && it.status !== 'done' ? missing(it) : '';
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
                    label="Short notes for the AI"
                    hint="Anything you know: rooms, sizes, view, furniture, ownership, what's nearby. Note form is fine."
                  >
                    <Textarea
                      rows={3}
                      maxLength={2000}
                      value={it.notes}
                      onChange={e => patch(it.key, {notes: e.target.value})}
                      placeholder="3 bed 3 bath, 280 sqm on 600 sqm land, sea view, fully furnished, 5 min to Kata beach, freehold"
                    />
                  </Field>

                  <div className="grid grid-cols-4 upto600:grid-cols-2 gap-[10px]">
                    <Field label="Rent or sale">
                      <Select value={it.mode} onChange={e => patch(it.key, {mode: e.target.value as Mode})}>
                        <option value="rent">For rent</option>
                        <option value="buy">For sale</option>
                      </Select>
                    </Field>
                    <Field label="Type">
                      <Select value={it.type} onChange={e => patch(it.key, {type: e.target.value as PropType})}>
                        {Object.entries(TYPES).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Area">
                      <Select value={it.area} onChange={e => patch(it.key, {area: e.target.value})}>
                        <option value="" disabled>
                          Choose
                        </option>
                        {AREAS.map(a => (
                          <option key={a.k}>{a.k}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      label={it.mode === 'buy' ? 'Price (THB)' : 'Rent / month (THB)'}
                      hint={Number(digits(it.price)) ? thb(Number(digits(it.price))) : undefined}
                    >
                      <Input
                        inputMode="numeric"
                        value={it.price}
                        onChange={e => patch(it.key, {price: e.target.value})}
                        placeholder={it.mode === 'buy' ? '14900000' : '60000'}
                      />
                    </Field>
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
