import {useState} from 'react';
import {Alert, Badge, Btn, Card, Input, Select} from '@/components/admin/kit';
import {AREAS, TYPES} from '@/concierge/data';
import PropertyImage from '@/components/site/PropertyImage';
import {useCanAccess} from '@/hooks/useAuth';
import {useToast} from '@/hooks/useToast';
import {cx, thb, when} from '@/lib/format';
import type {AdminListing} from '@/types/admin';
import {useListingFilters, type ListingFilters} from '@/pages/admin-dashboard/hooks/useListingFilters';
import {useListings} from '@/pages/admin-dashboard/hooks/useListings';
import AiDraftsSheet from './AiDraftsSheet';
import ListingEditor, {nextRefCode} from './ListingEditor';

export default function PropertiesPanel() {
  /* page access means full access (the CEO grants pages, not separate read-only rights) */
  const editable = useCanAccess('properties');
  const toast = useToast();
  const {listings: rows, error, pendingId, bulkPending, upsert, togglePublished, remove, removeMany} = useListings();
  const {filters, setFilter, shown, stats} = useListingFilters(rows);
  const [editing, setEditing] = useState<AdminListing | 'new' | null>(null);
  const [withAi, setWithAi] = useState(false);

  /* selection only counts what the filters show, so nothing hidden by a filter is deleted by surprise */
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const picked = shown.filter(p => selected.has(p.id));
  const allPicked = shown.length > 0 && picked.length === shown.length;
  const busy = bulkPending || pendingId !== null;

  const toggle = (id: string) =>
    setSelected(s => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allPicked ? new Set() : new Set(shown.map(p => p.id)));

  async function deletePicked() {
    const n = picked.length;
    if (!confirm(`Delete ${n} selected ${n === 1 ? 'property' : 'properties'} permanently? This cannot be undone.`))
      return;
    if (await removeMany(picked.map(p => p.id))) setSelected(new Set());
  }

  async function deleteAll() {
    const n = rows?.length ?? 0;
    const typed = prompt(
      [
        `Delete ALL ${n} properties permanently? This cannot be undone.`,
        'Until you add new ones, the website shows its built-in sample homes.',
        'Type DELETE to confirm.'
      ].join('\n\n')
    );
    if (typed?.trim().toUpperCase() !== 'DELETE') return;
    if (await removeMany('all')) setSelected(new Set());
  }

  function confirmRemove(p: AdminListing) {
    if (
      confirm(`Delete “${p.name}” permanently? This cannot be undone.

Tip: use “Hide” instead if it may come back.`)
    )
      void remove(p);
  }

  return (
    <section className="grid gap-[22px]">
      <div className="flex items-end justify-between gap-[16px] flex-wrap">
        <div>
          <h1 className="text-[clamp(32px,5vw,44px)]">Properties management</h1>
          <p className="text-muted m-0 mt-[4px] text-[14px]">
            {editable
              ? 'Live properties appear on the website straight away. Hidden ones stay here until you publish them.'
              : 'You have read-only access. Ask a Super Admin if you need to edit properties.'}
          </p>
        </div>
        {editable && (
          <div className="flex gap-[8px] flex-wrap">
            <Btn onClick={() => setEditing('new')}>+ Add property</Btn>
            <Btn kind="primary" onClick={() => setWithAi(true)}>
              ✦ Add with AI
            </Btn>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 upto759:grid-cols-3 upto600:grid-cols-2 gap-[12px]">
        {stats.map(({label, value}) => (
          <Card key={label} className="py-[14px] px-[16px]">
            <div className="text-[12px] text-muted">{label}</div>
            <div className="font-mono text-[26px] mt-[2px]">{rows ? value : '–'}</div>
          </Card>
        ))}
      </div>

      {error && <Alert>{error.message}</Alert>}

      <div
        className="grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] upto759:grid-cols-2 gap-[10px]"
        role="search"
      >
        <Input
          type="search"
          placeholder="Search title, ELV code, website ID or description"
          value={filters.query}
          onChange={e => setFilter('query', e.target.value)}
          aria-label="Search properties"
          className="upto759:col-span-2"
        />
        <Select
          value={filters.mode}
          onChange={e => setFilter('mode', e.target.value as ListingFilters['mode'])}
          aria-label="Rent or sale"
        >
          <option value="all">Rent & sale</option>
          <option value="rent">For rent</option>
          <option value="buy">For sale</option>
        </Select>
        <Select
          value={filters.status}
          onChange={e => setFilter('status', e.target.value as ListingFilters['status'])}
          aria-label="Status"
        >
          <option value="all">Every status</option>
          <option value="live">Live</option>
          <option value="draft">Drafts to review</option>
          <option value="hidden">Hidden</option>
        </Select>
        <Select value={filters.area} onChange={e => setFilter('area', e.target.value)} aria-label="Area">
          <option value="all">All areas</option>
          {AREAS.map(a => (
            <option key={a.k}>{a.k}</option>
          ))}
        </Select>
      </div>

      {editable && !!rows?.length && (
        <Card className="py-[10px] px-[14px] flex items-center gap-[12px] flex-wrap">
          <label className="flex items-center gap-[10px] cursor-pointer text-[13.5px]">
            <input
              type="checkbox"
              checked={allPicked}
              ref={el => {
                if (el) el.indeterminate = picked.length > 0 && !allPicked;
              }}
              onChange={toggleAll}
              disabled={!shown.length}
              className="w-[18px] h-[18px] accent-[#E05CB5] cursor-pointer"
            />
            {picked.length ? `${picked.length} selected` : `Select all (${shown.length})`}
          </label>
          {picked.length > 0 && (
            <>
              <Btn size="sm" kind="danger" disabled={busy} onClick={() => void deletePicked()}>
                {bulkPending ? 'Deleting…' : `Delete selected (${picked.length})`}
              </Btn>
              <Btn size="sm" kind="quiet" disabled={busy} onClick={() => setSelected(new Set())}>
                Clear selection
              </Btn>
            </>
          )}
          <Btn size="sm" kind="danger" className="ml-auto" disabled={busy} onClick={() => void deleteAll()}>
            Delete all properties
          </Btn>
        </Card>
      )}

      {!rows && !error && <p className="text-muted">Loading properties…</p>}
      {rows && !rows.length && (
        <Card className="p-[28px] text-center text-muted">
          No properties yet.{editable && ' Use “+ Add property” to add the first one.'}
        </Card>
      )}
      {!!rows?.length && !shown.length && (
        <Card className="p-[28px] text-center text-muted">No properties match these filters.</Card>
      )}

      <ul className="list-none m-0 p-0 grid gap-[10px]">
        {shown.map(p => {
          return (
            <li key={p.id}>
              <Card
                className={cx(
                  'p-[12px] grid gap-[16px] items-center',
                  editable
                    ? 'grid-cols-[22px_120px_minmax(0,1fr)_auto] upto759:grid-cols-[22px_88px_minmax(0,1fr)]'
                    : 'grid-cols-[120px_minmax(0,1fr)_auto] upto759:grid-cols-[88px_minmax(0,1fr)]',
                  !p.published && 'opacity-75',
                  selected.has(p.id) && 'border-pink'
                )}
              >
                {editable && (
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Select ${p.name}`}
                    className="w-[18px] h-[18px] accent-[#E05CB5] cursor-pointer upto759:row-span-2"
                  />
                )}
                <PropertyImage
                  listing={p}
                  className="w-full aspect-[4/3] object-cover rounded-[10px] bg-surface-2 upto759:row-span-2"
                />
                <div className="min-w-0 grid gap-[4px]">
                  <div className="flex items-center gap-[8px] flex-wrap">
                    {p.refCode && (
                      <span
                        className="font-mono text-[12px] font-semibold text-ink bg-surface-2 border border-line rounded-[6px] py-[1px] px-[6px]"
                        title="Private reference code (not shown on the website)"
                      >
                        {p.refCode}
                      </span>
                    )}
                    <b className="text-[15.5px]">{p.name}</b>
                    {p.published ? (
                      <Badge tone="good">Live</Badge>
                    ) : p.draft ? (
                      <Badge tone="violet">Draft · review</Badge>
                    ) : (
                      <Badge>Hidden</Badge>
                    )}
                    {p.photos.length > 1 && <span className="text-[12px] text-faint">{p.photos.length} photos</span>}
                    <Badge tone={p.mode === 'rent' ? 'violet' : 'pink'}>
                      {p.mode === 'rent' ? 'For rent' : 'For sale'}
                    </Badge>
                  </div>
                  <div className="text-[13px] text-muted">
                    {p.area} · {TYPES[p.type]} · {p.beds} bed{p.baths ? ` · ${p.baths} bath` : ''}
                    {p.sqm ? ` · ${p.sqm} m²` : ''} ·{' '}
                    <span className="font-mono text-ink">
                      {thb(p.price)}
                      {p.mode === 'rent' ? '/mo' : ''}
                    </span>
                  </div>
                  <div className="text-[12px] text-faint truncate">
                    Website ID <span className="font-mono">{p.id}</span> · updated {when(p.updatedAt)}
                    {p.updatedBy && p.updatedBy !== 'seed' ? ` by ${p.updatedBy}` : ''}
                  </div>
                </div>
                <div
                  className={cx(
                    'flex gap-[6px] flex-wrap justify-end upto759:justify-start',
                    editable && 'upto759:col-start-3'
                  )}
                >
                  {editable ? (
                    <>
                      <Btn size="sm" kind={p.draft ? 'primary' : undefined} onClick={() => setEditing(p)}>
                        {p.draft ? 'Review' : 'Edit'}
                      </Btn>
                      {/* a draft is approved from the editor, after a person has checked it */}
                      {!p.draft && (
                        <Btn size="sm" disabled={busy} onClick={() => void togglePublished(p)}>
                          {p.published ? 'Hide' : 'Publish'}
                        </Btn>
                      )}
                      <Btn size="sm" kind="danger" disabled={busy} onClick={() => confirmRemove(p)}>
                        Delete
                      </Btn>
                    </>
                  ) : (
                    <Btn size="sm" onClick={() => setEditing(p)}>
                      View
                    </Btn>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      {withAi && (
        <AiDraftsSheet
          onClose={() => setWithAi(false)}
          onCreated={upsert}
          onReview={l => {
            setWithAi(false);
            setEditing(l);
          }}
        />
      )}

      {editing && (
        <ListingEditor
          listing={editing === 'new' ? null : editing}
          suggestedRef={nextRefCode(rows ?? [])}
          readOnly={!editable}
          onClose={() => setEditing(null)}
          onSaved={(l, created) => {
            upsert(l);
            setEditing(null);
            toast.success(created ? `“${l.name}” was added.` : `“${l.name}” was saved.`);
          }}
        />
      )}
    </section>
  );
}
