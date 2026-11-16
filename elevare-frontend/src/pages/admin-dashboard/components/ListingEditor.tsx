/* read-only for viewers; the parent updates its list */
import {useRef, useState, type FormEvent} from 'react';
import {Alert, Btn, Field, Input, Select, Sheet, Textarea} from '@/components/admin/kit';
import {AMEN, AREAS, TYPES, type Mode, type PropType} from '@/concierge/data';
import PropertyImage from '@/components/site/PropertyImage';
import {useMutation} from '@/hooks/useMutation';
import {cx, digits, thb} from '@/lib/format';
import {listingsApi} from '@/services/listingsApi';
import type {AdminListing, ListingInput} from '@/types/admin';

interface Draft {
  mode: Mode;
  name: string;
  area: string;
  type: PropType;
  beds: string;
  sqm: string;
  price: string;
  own: string;
  rent: string;
  am: string[];
  ex: string;
  line: string;
  photo: string;
  hue: number;
  published: boolean;
}
const fromListing = (l: AdminListing | null): Draft =>
  l
    ? {
        mode: l.mode,
        name: l.name,
        area: l.area,
        type: l.type,
        beds: String(l.beds),
        sqm: String(l.sqm),
        price: String(l.price),
        own: l.own || '',
        rent: l.rent ? String(l.rent) : '',
        am: l.am,
        ex: l.ex.join('\n'),
        line: l.line,
        photo: l.photo || '',
        hue: l.hue,
        published: l.published
      }
    : {
        mode: 'rent',
        name: '',
        area: '',
        type: 'villa',
        beds: '2',
        sqm: '',
        price: '',
        own: '',
        rent: '',
        am: [],
        ex: '',
        line: '',
        photo: '',
        hue: Math.floor(Math.random() * 360),
        published: true
      };
const OWNERSHIP = [
  'Foreign freehold',
  'Leasehold 30 + 30 years',
  'Freehold (Thai company) or leasehold',
  'Leasehold or company freehold'
];

/* draft (form strings) → API payload */
const toInput = (d: Draft): ListingInput => {
  const buy = d.mode === 'buy';
  return {
    mode: d.mode,
    name: d.name.trim(),
    area: d.area,
    type: d.type,
    beds: Number(d.beds),
    sqm: Number(d.sqm),
    price: Number(digits(d.price)),
    own: buy ? d.own.trim() : undefined,
    rent: buy ? Number(digits(d.rent)) : undefined,
    am: d.am,
    ex: d.ex
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean),
    line: d.line.trim(),
    photo: d.photo || null,
    hue: d.hue,
    published: d.published
  };
};

export default function ListingEditor({
  listing,
  readOnly,
  onClose,
  onSaved
}: {
  listing: AdminListing | null;
  readOnly: boolean;
  onClose: () => void;
  onSaved: (l: AdminListing, created: boolean) => void;
}) {
  const [d, setD] = useState<Draft>(() => fromListing(listing));
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(x => ({...x, [k]: v}));
  const buy = d.mode === 'buy';

  const saving = useMutation((input: ListingInput) =>
    listing ? listingsApi.update(listing.id, input) : listingsApi.create(input)
  );
  const uploading = useMutation(listingsApi.uploadPhoto);
  const error = saving.error || uploading.error;

  async function upload(f: File) {
    const r = await uploading.run(f);
    if (r.ok) set('photo', r.data);
    if (file.current) file.current.value = '';
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    uploading.reset();
    const r = await saving.run(toInput(d));
    if (r.ok) onSaved(r.data, !listing);
    else document.getElementById('editor-error')?.scrollIntoView({behavior: 'smooth', block: 'center'});
  }

  const priceNum = Number(digits(d.price)),
    rentNum = Number(digits(d.rent));

  return (
    <Sheet
      title={readOnly ? d.name : listing ? 'Edit property' : 'Add property'}
      onClose={onClose}
      footer={
        readOnly ? (
          <Btn onClick={onClose}>Close</Btn>
        ) : (
          <>
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn kind="primary" type="submit" form="listing-form" disabled={saving.pending || uploading.pending}>
              {saving.pending ? 'Saving…' : listing ? 'Save changes' : 'Add property'}
            </Btn>
          </>
        )
      }
    >
      <form id="listing-form" onSubmit={save} className="grid gap-[18px]">
        <div id="editor-error">{error && <Alert>{error}</Alert>}</div>
        <fieldset disabled={readOnly} className="border-0 p-0 m-0 grid gap-[18px] min-w-0">
          <div className="grid grid-cols-2 gap-[8px]" role="radiogroup" aria-label="Rent or sale">
            {(['rent', 'buy'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={d.mode === m}
                onClick={() => set('mode', m)}
                className={cx(
                  'border rounded-[12px] py-[12px] cursor-pointer text-[14px] font-semibold',
                  d.mode === m ? 'grad-border text-ink' : 'border-line bg-surface text-muted hover:border-violet'
                )}
              >
                {m === 'rent' ? 'For rent' : 'For sale'}
              </button>
            ))}
          </div>

          <Field label="Property name">
            <Input
              required
              value={d.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Villa Sala Lagoon"
              maxLength={80}
            />
          </Field>

          <div className="grid grid-cols-2 upto480:grid-cols-1 gap-[14px]">
            <Field label="Area">
              <Select required value={d.area} onChange={e => set('area', e.target.value)}>
                <option value="" disabled>
                  Choose an area
                </option>
                {AREAS.map(a => (
                  <option key={a.k}>{a.k}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type">
              <Select value={d.type} onChange={e => set('type', e.target.value as PropType)}>
                {Object.entries(TYPES).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bedrooms">
              <Input
                type="number"
                min={1}
                max={20}
                required
                value={d.beds}
                onChange={e => set('beds', e.target.value)}
              />
            </Field>
            <Field label="Size (m²)">
              <Input
                type="number"
                min={10}
                required
                value={d.sqm}
                onChange={e => set('sqm', e.target.value)}
                placeholder="e.g. 220"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 upto480:grid-cols-1 gap-[14px]">
            <Field
              label={buy ? 'Sale price (THB)' : 'Monthly rent (THB)'}
              hint={priceNum ? thb(priceNum) + (buy ? '' : ' per month') : undefined}
            >
              <Input
                inputMode="numeric"
                required
                value={d.price}
                onChange={e => set('price', e.target.value)}
                placeholder={buy ? 'e.g. 14900000' : 'e.g. 60000'}
              />
            </Field>
            {buy && (
              <Field
                label="Estimated rent (THB / month)"
                hint={
                  rentNum && priceNum
                    ? `Gross yield ≈ ${(((rentNum * 12) / priceNum) * 100).toFixed(1)}%`
                    : 'Used to show the yield'
                }
              >
                <Input
                  inputMode="numeric"
                  required
                  value={d.rent}
                  onChange={e => set('rent', e.target.value)}
                  placeholder="e.g. 70000"
                />
              </Field>
            )}
          </div>

          {buy && (
            <Field label="Ownership" hint="Shown to buyers; “freehold” also counts for buyers who ask for freehold.">
              <Input
                required
                list="ownership"
                value={d.own}
                onChange={e => set('own', e.target.value)}
                placeholder="e.g. Foreign freehold"
              />
              <datalist id="ownership">
                {OWNERSHIP.map(o => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </Field>
          )}

          <Field label="Short description" hint="One or two sentences, shown on the listing card.">
            <Textarea
              value={d.line}
              onChange={e => set('line', e.target.value)}
              maxLength={240}
              rows={3}
              placeholder="Garden pool villa on a quiet lane, ten minutes from Nai Harn."
            />
          </Field>

          <fieldset className="border-0 p-0 m-0 grid gap-[8px] min-w-0">
            <legend className="text-[12px] text-muted font-semibold mb-[6px] p-0">
              Features <span className="font-normal text-faint">(used to match visitors to this home)</span>
            </legend>
            <div className="flex flex-wrap gap-[8px]">
              {Object.entries(AMEN).map(([k, l]) => {
                const on = d.am.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('am', on ? d.am.filter(x => x !== k) : [...d.am, k])}
                    className="border border-line bg-surface rounded-full py-[7px] px-[13px] text-[13px] cursor-pointer hover:border-violet aria-pressed:bg-grad! aria-pressed:border-transparent! aria-pressed:text-white aria-pressed:font-semibold disabled:cursor-default"
                  >
                    {l}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Field label="What’s included" hint="One per line, e.g. “Pool & garden care”. Up to 8.">
            <Textarea
              value={d.ex}
              onChange={e => set('ex', e.target.value)}
              rows={3}
              placeholder={'Pool & garden care\nFibre internet installed'}
            />
          </Field>

          <div className="grid gap-[8px]">
            <span className="text-[12px] text-muted font-semibold">Photo</span>
            <div className="grid grid-cols-[180px_1fr] upto480:grid-cols-1 gap-[14px] items-center">
              <PropertyImage
                listing={{photo: d.photo ?? undefined}}
                className="w-full aspect-[4/3] rounded-[12px] border border-line bg-surface-2"
              />
              <div className="grid gap-[8px] justify-items-start">
                {!readOnly && (
                  <>
                    <input
                      ref={file}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      hidden
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) void upload(f);
                      }}
                    />
                    <Btn size="sm" disabled={uploading.pending} onClick={() => file.current?.click()}>
                      {uploading.pending ? 'Uploading…' : d.photo ? 'Replace photo' : 'Upload photo'}
                    </Btn>
                    {d.photo && (
                      <Btn size="sm" kind="quiet" onClick={() => set('photo', '')}>
                        Remove photo
                      </Btn>
                    )}
                  </>
                )}
                <span className="text-[11.5px] text-faint">
                  {d.photo
                    ? 'JPG, PNG or WebP, up to 8 MB. Landscape works best.'
                    : 'No photo yet: the website shows a stock photo for this type of home.'}
                </span>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-[10px] cursor-pointer text-[14px] bg-surface border border-line rounded-[12px] py-[12px] px-[14px]">
            <input
              type="checkbox"
              checked={d.published}
              onChange={e => set('published', e.target.checked)}
              className="w-[18px] h-[18px] accent-[#E05CB5]"
            />
            <span>
              <b>Show on the website</b>
              <br />
              <span className="text-[12px] text-muted">Leave unticked to save it as hidden.</span>
            </span>
          </label>
        </fieldset>
      </form>
    </Sheet>
  );
}
