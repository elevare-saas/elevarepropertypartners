/* add / edit a property; the parent updates its list.
   The reference code (e.g. ELV-001) is private: dashboard, inquiry emails and webhook only, never the website. */
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
  baths: string;
  sqm: string;
  land: string;
  refCode: string;
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
const fromListing = (l: AdminListing | null, suggestedRef: string): Draft =>
  l
    ? {
        mode: l.mode,
        name: l.name,
        area: l.area,
        type: l.type,
        beds: String(l.beds),
        baths: l.baths ? String(l.baths) : '',
        sqm: l.sqm ? String(l.sqm) : '',
        land: l.land ? String(l.land) : '',
        refCode: l.refCode ?? '',
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
        baths: '',
        sqm: '',
        land: '',
        refCode: suggestedRef,
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
    baths: d.baths.trim() ? Number(d.baths) : null,
    sqm: d.sqm.trim() ? Number(d.sqm) : null,
    land: d.land.trim() ? Number(d.land) : null,
    refCode: d.refCode.trim().toUpperCase(),
    price: Number(digits(d.price)),
    own: buy ? d.own.trim() || null : undefined,
    rent: buy ? (digits(d.rent) ? Number(digits(d.rent)) : null) : undefined,
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

/* the next free ELV-### code, after the highest one in use */
export function nextRefCode(listings: Pick<AdminListing, 'refCode'>[]) {
  const top = Math.max(0, ...listings.map(l => Number(/^ELV-(\d+)$/i.exec(l.refCode ?? '')?.[1] ?? 0)));
  return `ELV-${String(top + 1).padStart(3, '0')}`;
}

/* a public title from the facts, never the project or building name: "3-Bed Sea-View Pool Villa in Kata" */
function suggestTitle(d: Draft) {
  const kind = {villa: 'Pool Villa', condo: 'Condo', townhouse: 'Townhouse'}[d.type];
  const view = d.am.includes('seaview') ? 'Sea-View ' : '';
  return `${d.beds}-Bed ${view}${kind}${d.area ? ` in ${d.area}` : ''}`;
}

export default function ListingEditor({
  listing,
  suggestedRef,
  readOnly,
  onClose,
  onSaved
}: {
  listing: AdminListing | null;
  suggestedRef: string;
  readOnly: boolean;
  onClose: () => void;
  onSaved: (l: AdminListing, created: boolean) => void;
}) {
  const [d, setD] = useState<Draft>(() => fromListing(listing, suggestedRef));
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

          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] upto480:grid-cols-1 gap-[14px] items-start">
            <Field
              label="Listing title (shown on the website)"
              hint="Describe the home; don't use the project or building name."
            >
              <div className="flex gap-[8px]">
                <Input
                  required
                  value={d.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. 2-Bed Sea-View Condo in Kata"
                  maxLength={80}
                />
                <Btn
                  size="sm"
                  onClick={() => set('name', suggestTitle(d))}
                  title="Build a title from the details below"
                >
                  Suggest
                </Btn>
              </div>
            </Field>
            <Field label="Reference code (private)" hint="Dashboard and inquiries only. Never on the website.">
              <Input
                value={d.refCode}
                onChange={e => set('refCode', e.target.value.toUpperCase())}
                placeholder="e.g. ELV-001"
                maxLength={30}
                className="font-mono"
              />
            </Field>
          </div>

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
            <Field label="Bathrooms (optional)">
              <Input
                type="number"
                min={1}
                max={20}
                value={d.baths}
                onChange={e => set('baths', e.target.value)}
                placeholder="e.g. 2"
              />
            </Field>
            <Field label="Floor area (m², optional)" hint="Indoor living / built-up area.">
              <Input
                type="number"
                min={10}
                value={d.sqm}
                onChange={e => set('sqm', e.target.value)}
                placeholder="e.g. 220"
              />
            </Field>
            <Field label="Land area (m², optional)" hint="Plot size, mainly for villas and houses.">
              <Input
                type="number"
                min={10}
                value={d.land}
                onChange={e => set('land', e.target.value)}
                placeholder="e.g. 600"
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
                label="Estimated rent (THB / month, optional)"
                hint={
                  rentNum && priceNum
                    ? `Gross yield ≈ ${(((rentNum * 12) / priceNum) * 100).toFixed(1)}%`
                    : 'If known: the website then shows the rental yield'
                }
              >
                <Input
                  inputMode="numeric"
                  value={d.rent}
                  onChange={e => set('rent', e.target.value)}
                  placeholder="e.g. 70000"
                />
              </Field>
            )}
          </div>

          {buy && (
            <Field
              label="Ownership (optional)"
              hint="Shown to buyers when filled in; “freehold” also matches buyers who ask for freehold."
            >
              <Input
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
