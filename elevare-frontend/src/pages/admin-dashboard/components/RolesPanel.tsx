/* Roles & access (Super Admin only; the server enforces it): which dashboard pages each role can open.
   An employee with several roles gets every page any of them allows. Changes apply on their next click. */
import {useState, type FormEvent} from 'react';
import {Alert, Badge, Btn, Card, Field, Input, Sheet, Textarea} from '@/components/admin/kit';
import {useMutation} from '@/hooks/useMutation';
import {useToast} from '@/hooks/useToast';
import {cx} from '@/lib/format';
import {rolesApi} from '@/services/rolesApi';
import type {PageInfo, PageKey, Role} from '@/types/admin';
import {useRoles} from '@/pages/admin-dashboard/hooks/useRoles';

const check = 'w-[18px] h-[18px] accent-[#E05CB5] cursor-pointer disabled:cursor-not-allowed';

export default function RolesPanel() {
  const toast = useToast();
  const {roles, pages, error, put, update, remove} = useRoles();
  const [editing, setEditing] = useState<Role | 'new' | null>(null);

  function togglePage(role: Role, page: PageInfo, on: boolean) {
    const next = on ? [...role.pages, page.key] : role.pages.filter(p => p !== page.key);
    void update(
      role,
      {pages: next},
      on ? `“${role.name}” can now open ${page.label}.` : `“${role.name}” can no longer open ${page.label}.`
    );
  }

  function confirmRemove(role: Role) {
    const who = role.members
      ? `\n\n${role.members} employee${role.members > 1 ? 's' : ''} will lose the pages this role gives (other roles they have stay).`
      : '';
    if (confirm(`Delete the role “${role.name}”?${who}`)) void remove(role);
  }

  return (
    <section className="grid gap-[18px]">
      <div className="flex items-end justify-between gap-[16px] flex-wrap">
        <p className="text-muted m-0 text-[14px] max-w-[62ch]">
          Tick the pages each role can open. An employee with several roles gets every page any of them allows. Account
          management is always available to everyone.
        </p>
        <Btn kind="primary" onClick={() => setEditing('new')}>
          + New role
        </Btn>
      </div>

      {error && <Alert>{error.message}</Alert>}
      {!roles && !error && <p className="text-muted">Loading roles…</p>}

      {roles && pages && (
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-[14px] min-w-[560px]">
            <thead>
              <tr className="text-left text-[12px] text-muted">
                <th className="py-[12px] px-[16px] font-semibold">Role</th>
                {pages.map(p => (
                  <th key={p.key} className="py-[12px] px-[10px] font-semibold text-center" title={p.description}>
                    {p.label}
                  </th>
                ))}
                <th className="py-[12px] px-[10px] font-semibold text-center">People</th>
                <th className="py-[12px] px-[16px]" />
              </tr>
            </thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id} className="border-t border-line">
                  <td className="py-[12px] px-[16px]">
                    <div className="flex items-center gap-[8px] flex-wrap">
                      <b>{r.name}</b>
                      {r.system && <Badge tone="pink">Every page</Badge>}
                    </div>
                    {r.description && <div className="text-[12.5px] text-muted mt-[2px]">{r.description}</div>}
                  </td>
                  {pages.map(p => (
                    <td key={p.key} className="py-[12px] px-[10px] text-center">
                      <input
                        type="checkbox"
                        className={check}
                        checked={r.system || r.pages.includes(p.key)}
                        disabled={r.system}
                        onChange={e => togglePage(r, p, e.target.checked)}
                        aria-label={`${r.name} can open ${p.label}`}
                      />
                    </td>
                  ))}
                  <td className="py-[12px] px-[10px] text-center text-muted">{r.members}</td>
                  <td className="py-[12px] px-[16px]">
                    {!r.system && (
                      <div className="flex gap-[6px] justify-end">
                        <Btn size="sm" onClick={() => setEditing(r)}>
                          Edit
                        </Btn>
                        <Btn size="sm" kind="danger" onClick={() => confirmRemove(r)}>
                          Delete
                        </Btn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {editing && pages && (
        <RoleSheet
          role={editing === 'new' ? null : editing}
          pages={pages}
          onClose={() => setEditing(null)}
          onSaved={(role, created) => {
            put(role);
            setEditing(null);
            toast.success(created ? `The role “${role.name}” was created.` : `“${role.name}” was saved.`);
          }}
        />
      )}
    </section>
  );
}

function RoleSheet({
  role,
  pages,
  onClose,
  onSaved
}: {
  role: Role | null;
  pages: PageInfo[];
  onClose: () => void;
  onSaved: (role: Role, created: boolean) => void;
}) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [granted, setGranted] = useState<PageKey[]>(role?.pages ?? []);
  const saving = useMutation(() => {
    const input = {name: name.trim(), description: description.trim(), pages: granted};
    return role ? rolesApi.update(role.id, input) : rolesApi.create(input);
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = await saving.run();
    if (r.ok) onSaved(r.data, !role);
  }

  return (
    <Sheet
      title={role ? `Edit “${role.name}”` : 'New role'}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" type="submit" form="role-form" disabled={saving.pending}>
            {saving.pending ? 'Saving…' : role ? 'Save role' : 'Create role'}
          </Btn>
        </>
      }
    >
      <form id="role-form" onSubmit={submit} className="grid gap-[16px]">
        {saving.error && <Alert>{saving.error}</Alert>}
        <Field label="Name">
          <Input
            required
            autoFocus
            maxLength={60}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Sales Agent"
          />
        </Field>
        <Field label="Description" hint="Optional: what this role is for.">
          <Textarea maxLength={200} rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
        <fieldset className="grid gap-[8px] m-0 p-0 border-0">
          <legend className="text-[12px] text-muted font-semibold mb-[8px]">Pages this role can open</legend>
          {pages.map(p => (
            <label
              key={p.key}
              className={cx(
                'flex items-start gap-[12px] cursor-pointer rounded-[12px] border py-[12px] px-[14px]',
                granted.includes(p.key) ? 'border-pink bg-surface' : 'border-line'
              )}
            >
              <input
                type="checkbox"
                className={cx(check, 'mt-[2px]')}
                checked={granted.includes(p.key)}
                onChange={e => setGranted(g => (e.target.checked ? [...g, p.key] : g.filter(k => k !== p.key)))}
              />
              <span>
                <b className="text-[14px]">{p.label}</b>
                <span className="block text-[12.5px] text-muted">{p.description}</span>
              </span>
            </label>
          ))}
          <p className="m-0 text-[12px] text-faint">Account management is always available.</p>
        </fieldset>
      </form>
    </Sheet>
  );
}
