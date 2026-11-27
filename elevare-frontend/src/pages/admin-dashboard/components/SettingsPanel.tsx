/* Website settings: the areas, the market estimates behind "vs. area average", and the public contact details.
   Stored in the database (backend/src/lib/settings.ts); the website reads them when a page opens. Each section saves on
   its own. Renaming an area moves its properties with it; an area that still has properties can't be removed. */
import {useState, type ReactNode} from 'react';
import {Alert, Badge, Btn, Card, Field, Input} from '@/components/admin/kit';
import {TYPES} from '@/concierge/data';
import {useMutation} from '@/hooks/useMutation';
import {useQuery} from '@/hooks/useQuery';
import {useToast} from '@/hooks/useToast';
import {cx, thb, when} from '@/lib/format';
import {errorMessage} from '@/lib/http';
import {applySettings, type SiteSettings} from '@/lib/siteSettings';
import {settingsApi, type AdminArea, type AdminSettings} from '@/services/settingsApi';

const TYPE_KEYS = ['villa', 'condo', 'townhouse', 'house'] as const;
const BEDS = ['1', '2', '3', '4', '5', '6'] as const;
const pct = (n: number) => String(Math.round(n * 1000) / 10);
const fromPct = (s: string) => Number(s.replace(',', '.')) / 100;
const digitsOf = (s: string) => Number(s.replace(/[^\d]/g, ''));

export default function SettingsPanel() {
  const q = useQuery('admin-settings', settingsApi.get);
  return (
    <section className="grid gap-[22px]">
      <div>
        <h1 className="text-[clamp(32px,5vw,44px)]">Website settings</h1>
        <p className="text-muted m-0 mt-[4px] text-[14px]">
          Areas, market estimates and contact details, stored in the database. The website uses the new values as soon
          as you save (visitors see them when they next open a page).
        </p>
      </div>
      {q.error && <Alert>{errorMessage(q.error)}</Alert>}
      {!q.data && !q.error && <p className="text-muted">Loading settings…</p>}
      {q.data && (
        <>
          <AreasCard data={q.data} />
          <MarketCard data={q.data} />
          <ContactCard data={q.data} />
        </>
      )}
    </section>
  );
}

function Section({
  title,
  about,
  updated,
  children,
  footer
}: {
  title: string;
  about: ReactNode;
  updated?: {updatedAt: string; updatedBy: string | null};
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Card className="p-[20px] upto480:p-[14px] grid gap-[16px]">
      <div>
        <h2 className="text-[24px]">{title}</h2>
        <p className="m-0 mt-[4px] text-[13.5px] text-muted">{about}</p>
        {updated && updated.updatedBy !== 'setup' && (
          <p className="m-0 mt-[4px] text-[12px] text-faint">
            Last saved {when(updated.updatedAt)}
            {updated.updatedBy ? ` by ${updated.updatedBy}` : ''}
          </p>
        )}
      </div>
      {children}
      <div className="flex items-center justify-end gap-[10px] flex-wrap">{footer}</div>
    </Card>
  );
}

/* ---------------- areas ---------------- */
interface AreaRow {
  key: string;
  id?: string;
  k: string;
  d: string;
  f: string;
  province: string;
  aliases: string;
  /* the name it was saved under (for the property count) */
  saved?: string;
}
let nextRow = 1;
const toRow = (a: AdminArea): AreaRow => ({
  key: a.id ?? `new${nextRow++}`,
  id: a.id,
  k: a.k,
  d: a.d,
  f: pct(a.f),
  province: a.province,
  aliases: a.aliases.join(', '),
  saved: a.k
});
const fromRow = (r: AreaRow): AdminArea => ({
  ...(r.id && {id: r.id}),
  k: r.k.trim(),
  d: r.d.trim(),
  f: fromPct(r.f),
  province: r.province.trim() || 'Phuket',
  aliases: r.aliases
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
});

function AreasCard({data}: {data: AdminSettings}) {
  const toast = useToast();
  const [rows, setRows] = useState<AreaRow[]>(() => data.areas.map(toRow));
  const [use, setUse] = useState(data.areaUse);
  const [dirty, setDirty] = useState(false);
  const save = useMutation(settingsApi.saveAreas);

  const edit = (key: string, p: Partial<AreaRow>) => {
    setRows(rs => rs.map(r => (r.key === key ? {...r, ...p} : r)));
    setDirty(true);
  };
  const move = (i: number, by: number) => {
    setRows(rs => {
      const next = [...rs];
      [next[i], next[i + by]] = [next[i + by], next[i]];
      return next;
    });
    setDirty(true);
  };
  const remove = (key: string) => {
    setRows(rs => rs.filter(r => r.key !== key));
    setDirty(true);
  };
  const add = () => {
    setRows(rs => [...rs, {key: `new${nextRow++}`, k: '', d: '', f: '100', province: 'Phuket', aliases: ''}]);
    setDirty(true);
  };

  async function submit() {
    const r = await save.run(rows.map(fromRow));
    if (!r.ok) return;
    setRows(r.data.value.map(toRow));
    setUse(r.data.areaUse);
    setDirty(false);
    applySettings({areas: r.data.value});
    const moved = r.data.renamed.map(x => `${x.from} → ${x.to}`).join(', ');
    toast.success(moved ? `Areas saved. Renamed (properties moved too): ${moved}.` : 'Areas saved.');
  }

  return (
    <Section
      title="Areas"
      about={
        <>
          The area list in the dashboard, the website’s area tiles and search. <b className="text-ink">Price level</b>{' '}
          is against the island average (100% = average, 125% = a quarter above) and drives “vs. area average”.{' '}
          <b className="text-ink">Other names</b> are words people write for the area (e.g. “Khao Lak” for Phang Nga);
          the notes in Add with AI and the website search understand them. Renaming an area moves its properties too.
        </>
      }
      updated={data.updated.areas}
      footer={
        <>
          {dirty && <span className="text-[12.5px] text-violet mr-auto">Unsaved changes</span>}
          <Btn onClick={add}>+ Add area</Btn>
          <Btn kind="primary" disabled={save.pending || !dirty} onClick={() => void submit()}>
            {save.pending ? 'Saving…' : 'Save areas'}
          </Btn>
        </>
      }
    >
      {save.error && <Alert>{save.error}</Alert>}
      <ol className="list-none m-0 p-0 grid gap-[10px]">
        {rows.map((r, i) => {
          const n = r.saved ? (use[r.saved] ?? 0) : 0;
          return (
            <li key={r.key} className="border border-line rounded-[12px] p-[12px] grid gap-[10px] bg-surface-2/40">
              <div className="grid grid-cols-[minmax(0,1.2fr)_110px_minmax(0,1fr)_auto] upto759:grid-cols-2 gap-[10px] items-end">
                <Field label={`Area ${i + 1}`}>
                  <Input
                    value={r.k}
                    onChange={e => edit(r.key, {k: e.target.value})}
                    maxLength={40}
                    placeholder="e.g. Kata"
                    aria-label={`Area ${i + 1} name`}
                  />
                </Field>
                <Field label="Price level %">
                  <Input
                    inputMode="decimal"
                    value={r.f}
                    onChange={e => edit(r.key, {f: e.target.value})}
                    aria-label={`${r.k || 'Area'} price level`}
                  />
                </Field>
                <Field label="Province" className="upto759:col-span-2">
                  <Input
                    value={r.province}
                    onChange={e => edit(r.key, {province: e.target.value})}
                    maxLength={40}
                    list="settings-provinces"
                    aria-label={`${r.k || 'Area'} province`}
                  />
                </Field>
                <div className="flex items-center gap-[6px] justify-end upto759:justify-start upto759:col-span-2 pb-[4px]">
                  <Badge tone={n ? 'violet' : undefined}>
                    {n} propert{n === 1 ? 'y' : 'ies'}
                  </Badge>
                  <Btn size="sm" kind="quiet" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                    ↑
                  </Btn>
                  <Btn
                    size="sm"
                    kind="quiet"
                    disabled={i === rows.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </Btn>
                  <Btn
                    size="sm"
                    kind="danger"
                    disabled={n > 0}
                    title={n > 0 ? 'Move its properties to another area first' : undefined}
                    onClick={() => remove(r.key)}
                    aria-label={`Remove ${r.k || 'area'}`}
                  >
                    ✕
                  </Btn>
                </div>
              </div>
              <div className="grid grid-cols-2 upto600:grid-cols-1 gap-[10px]">
                <Field label="Description (area tile and search)">
                  <Input
                    value={r.d}
                    onChange={e => edit(r.key, {d: e.target.value})}
                    maxLength={120}
                    placeholder="e.g. Surf beach, cafés and restaurants on foot"
                  />
                </Field>
                <Field label="Other names (comma-separated)">
                  <Input
                    value={r.aliases}
                    onChange={e => edit(r.key, {aliases: e.target.value})}
                    placeholder="e.g. Khao Lak, Natai"
                  />
                </Field>
              </div>
            </li>
          );
        })}
      </ol>
      <datalist id="settings-provinces">
        {[...new Set(['Phuket', 'Phang Nga', ...rows.map(r => r.province.trim()).filter(Boolean)])].map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>
    </Section>
  );
}

/* ---------------- market estimates ---------------- */
type Market = SiteSettings['market'];
interface MarketForm {
  rentBase: Record<string, string>;
  typeRent: Record<string, string>;
  sqmBase: Record<string, string>;
  avgYield: string;
  note: string;
}
const toMarketForm = (m: Market): MarketForm => ({
  rentBase: Object.fromEntries(BEDS.map(b => [b, String(m.rentBase[b] ?? '')])),
  typeRent: Object.fromEntries(TYPE_KEYS.map(t => [t, pct(m.typeRent[t] ?? 1)])),
  sqmBase: Object.fromEntries(TYPE_KEYS.map(t => [t, String(m.sqmBase[t] ?? '')])),
  avgYield: pct(m.avgYield),
  note: m.note
});
const fromMarketForm = (f: MarketForm): Market => ({
  rentBase: Object.fromEntries(BEDS.map(b => [b, digitsOf(f.rentBase[b])])),
  typeRent: Object.fromEntries(TYPE_KEYS.map(t => [t, fromPct(f.typeRent[t])])),
  sqmBase: Object.fromEntries(TYPE_KEYS.map(t => [t, digitsOf(f.sqmBase[t])])),
  avgYield: fromPct(f.avgYield),
  note: f.note.trim()
});

function MarketCard({data}: {data: AdminSettings}) {
  const toast = useToast();
  const [f, setF] = useState(() => toMarketForm(data.market));
  const [dirty, setDirty] = useState(false);
  const save = useMutation(settingsApi.saveMarket);
  const set = (group: 'rentBase' | 'typeRent' | 'sqmBase', k: string, v: string) => {
    setF(x => ({...x, [group]: {...x[group], [k]: v}}));
    setDirty(true);
  };
  async function submit() {
    const r = await save.run(fromMarketForm(f));
    if (!r.ok) return;
    setF(toMarketForm(r.data.value));
    setDirty(false);
    applySettings({market: r.data.value});
    toast.success('Market estimates saved.');
  }
  const money = (v: string) => (digitsOf(v) ? thb(digitsOf(v)) : undefined);

  return (
    <Section
      title="Market estimates"
      about="The website compares each home with these to show “vs. area average” and estimated yields. Each area’s price level (above) is applied on top."
      updated={data.updated.market}
      footer={
        <>
          {dirty && <span className="text-[12.5px] text-violet mr-auto">Unsaved changes</span>}
          <Btn kind="primary" disabled={save.pending || !dirty} onClick={() => void submit()}>
            {save.pending ? 'Saving…' : 'Save market estimates'}
          </Btn>
        </>
      }
    >
      {save.error && <Alert>{save.error}</Alert>}
      <Group title="Monthly rent of a furnished pool villa, by bedrooms (THB)">
        <div className="grid grid-cols-6 upto759:grid-cols-3 gap-[10px]">
          {BEDS.map(b => (
            <Field key={b} label={`${b} bed${b === '1' ? '' : 's'}`} hint={money(f.rentBase[b])}>
              <Input inputMode="numeric" value={f.rentBase[b]} onChange={e => set('rentBase', b, e.target.value)} />
            </Field>
          ))}
        </div>
      </Group>
      <Group title="Rent level by type, against a pool villa (%)">
        <div className="grid grid-cols-4 upto600:grid-cols-2 gap-[10px]">
          {TYPE_KEYS.map(t => (
            <Field key={t} label={TYPES[t]}>
              <Input inputMode="decimal" value={f.typeRent[t]} onChange={e => set('typeRent', t, e.target.value)} />
            </Field>
          ))}
        </div>
      </Group>
      <Group title="Sale price per m², by type (THB)">
        <div className="grid grid-cols-4 upto600:grid-cols-2 gap-[10px]">
          {TYPE_KEYS.map(t => (
            <Field key={t} label={TYPES[t]} hint={money(f.sqmBase[t])}>
              <Input inputMode="numeric" value={f.sqmBase[t]} onChange={e => set('sqmBase', t, e.target.value)} />
            </Field>
          ))}
        </div>
      </Group>
      <div className="grid grid-cols-[160px_minmax(0,1fr)] upto600:grid-cols-1 gap-[10px]">
        <Field label="Typical yield %" hint="Homes for sale above it are flagged as good yield.">
          <Input
            inputMode="decimal"
            value={f.avgYield}
            onChange={e => {
              setF(x => ({...x, avgYield: e.target.value}));
              setDirty(true);
            }}
          />
        </Field>
        <Field label="Fine print under the comparison">
          <Input
            value={f.note}
            maxLength={200}
            onChange={e => {
              setF(x => ({...x, note: e.target.value}));
              setDirty(true);
            }}
          />
        </Field>
      </div>
    </Section>
  );
}

const Group = ({title, children}: {title: string; children: ReactNode}) => (
  <div className="grid gap-[8px]">
    <span className="text-[13px] font-semibold">{title}</span>
    {children}
  </div>
);

/* ---------------- contact details ---------------- */
function ContactCard({data}: {data: AdminSettings}) {
  const toast = useToast();
  const [c, setC] = useState(data.contact);
  const [dirty, setDirty] = useState(false);
  const save = useMutation(settingsApi.saveContact);
  const set = (k: keyof SiteSettings['contact'], v: string) => {
    setC(x => ({...x, [k]: v}));
    setDirty(true);
  };
  async function submit() {
    const r = await save.run(c);
    if (!r.ok) return;
    setC(r.data.value);
    setDirty(false);
    applySettings({contact: r.data.value});
    toast.success('Contact details saved.');
  }
  const wa = c.whatsapp.replace(/\D/g, '');

  return (
    <Section
      title="Contact details"
      about="Shown on the website. Every contact button opens WhatsApp with a ready message, so the number is required."
      updated={data.updated.contact}
      footer={
        <>
          {dirty && <span className="text-[12.5px] text-violet mr-auto">Unsaved changes</span>}
          <Btn kind="primary" disabled={save.pending || !dirty} onClick={() => void submit()}>
            {save.pending ? 'Saving…' : 'Save contact details'}
          </Btn>
        </>
      }
    >
      {save.error && <Alert>{save.error}</Alert>}
      <div className="grid grid-cols-2 upto600:grid-cols-1 gap-[12px]">
        <Field
          label="WhatsApp number"
          hint={
            wa.length >= 8 ? (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" className="text-violet">
                Test: open wa.me/{wa} ↗
              </a>
            ) : (
              'International format, digits only, e.g. 66812345678'
            )
          }
        >
          <Input inputMode="tel" value={c.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={c.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Reply hours" hint={`Shown as: “We reply on WhatsApp ${c.replyWindow || '…'}.”`}>
          <Input value={c.replyWindow} maxLength={80} onChange={e => set('replyWindow', e.target.value)} />
        </Field>
        <Field label="Location (footer)">
          <Input value={c.location} maxLength={60} onChange={e => set('location', e.target.value)} />
        </Field>
      </div>
      <p className={cx('m-0 text-[12px] text-faint')}>
        The email and number are also given to search engines as the business’s contact details.
      </p>
    </Section>
  );
}
