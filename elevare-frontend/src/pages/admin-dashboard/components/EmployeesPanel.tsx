/* Employees management: accounts and their roles (an employee can have several). Super Admins also get the
   Roles & access tab. The server enforces every rule; the UI just doesn't offer what would be refused. */
import {useState, type FormEvent} from 'react';
import {Alert, Badge, Btn, Card, Field, Input, Sheet} from '@/components/admin/kit';
import {useCurrentUser} from '@/hooks/useAuth';
import {useMutation} from '@/hooks/useMutation';
import {useSearchParam} from '@/hooks/useRouter';
import {useToast} from '@/hooks/useToast';
import {cx, when} from '@/lib/format';
import {roleNames} from '@/lib/roles';
import {usersApi} from '@/services/usersApi';
import type {AdminUser, Role} from '@/types/admin';
import {useRoles} from '@/pages/admin-dashboard/hooks/useRoles';
import {useTeam} from '@/pages/admin-dashboard/hooks/useTeam';
import RolesPanel from './RolesPanel';

const tempPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(14)), x => alphabet[x % alphabet.length]).join('');
};
/* stays until closed so it can be copied */
const SHARE = {persist: true};

export default function EmployeesPanel() {
  const me = useCurrentUser();
  const [tab, setTab] = useSearchParam('tab');
  const showRoles = me.superAdmin && tab === 'roles';

  return (
    <section className="grid gap-[22px]">
      <div>
        <h1 className="text-[clamp(32px,5vw,44px)]">Employees management</h1>
        <p className="text-muted m-0 mt-[4px] text-[14px]">
          Who can sign in to the dashboard, and which pages each person can open.
        </p>
      </div>
      {me.superAdmin && (
        <div role="tablist" aria-label="Employees management" className="flex gap-[4px] border-b border-line">
          {(
            [
              [null, 'Employees'],
              ['roles', 'Roles & access']
            ] as const
          ).map(([key, label]) => {
            const on = key === 'roles' ? showRoles : !showRoles;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(key)}
                className={cx(
                  'border-0 bg-transparent cursor-pointer py-[10px] px-[14px] text-[14px] -mb-px',
                  on
                    ? 'text-ink font-semibold [border-bottom:2px_solid_var(--color-pink)]'
                    : 'text-muted hover:text-ink [border-bottom:2px_solid_transparent]'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      {showRoles ? <RolesPanel /> : <EmployeesList />}
    </section>
  );
}

/* why a role can't be handed out by this user ('' when it can) */
function lockedReason(me: AdminUser, role: Role) {
  if (me.superAdmin) return '';
  if (role.system) return 'Only a Super Admin can give this role';
  if (role.pages.some(p => !me.pages.includes(p))) return 'Includes pages you don’t have';
  return '';
}

function EmployeesList() {
  const me = useCurrentUser();
  const toast = useToast();
  const {members, error, add, update, remove} = useTeam();
  const {roles} = useRoles();
  const [inviting, setInviting] = useState(false);
  const [editingRoles, setEditingRoles] = useState<AdminUser | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);

  function confirmRemove(u: AdminUser) {
    if (confirm(`Delete ${u.email}? They will lose access immediately.`)) void remove(u);
  }

  return (
    <div className="grid gap-[18px]">
      <div className="flex justify-end">
        <Btn kind="primary" onClick={() => setInviting(true)} disabled={!roles}>
          + Add employee
        </Btn>
      </div>

      {error && <Alert>{error.message}</Alert>}
      {!members && !error && <p className="text-muted">Loading employees…</p>}

      <ul className="list-none m-0 p-0 grid gap-[10px]">
        {members?.map(u => {
          const self = u.id === me.id;
          /* a non-Super-Admin can't change a Super Admin's account (the server refuses too) */
          const locked = u.superAdmin && !me.superAdmin;
          return (
            <li key={u.id}>
              <Card
                className={cx(
                  'p-[14px] grid grid-cols-[minmax(0,1fr)_auto] upto759:grid-cols-1 gap-[14px] items-center',
                  !u.active && 'opacity-70'
                )}
              >
                <div className="min-w-0 grid gap-[4px]">
                  <div className="flex items-center gap-[8px] flex-wrap">
                    <b className="text-[15px]">{u.name || u.email}</b>
                    {self && <Badge tone="violet">You</Badge>}
                    {!u.active && <Badge>Disabled</Badge>}
                  </div>
                  <div className="text-[13px] text-muted truncate">{u.email}</div>
                  <div className="flex gap-[6px] flex-wrap">
                    {u.roles.length ? (
                      u.roles.map(r => (
                        <Badge key={r.id} tone={r.system ? 'pink' : 'violet'}>
                          {r.name}
                        </Badge>
                      ))
                    ) : (
                      <Badge>No role: Account only</Badge>
                    )}
                  </div>
                  <div className="text-[12px] text-faint">Last sign-in {when(u.lastLoginAt)}</div>
                </div>
                {!locked && (
                  <div className="flex gap-[6px] flex-wrap justify-end upto759:justify-start">
                    {(!self || me.superAdmin) && (
                      <Btn size="sm" onClick={() => setEditingRoles(u)} disabled={!roles}>
                        Roles
                      </Btn>
                    )}
                    <Btn size="sm" onClick={() => setResetting(u)}>
                      Reset password
                    </Btn>
                    {!self && (
                      <Btn
                        size="sm"
                        onClick={() =>
                          void update(u, {active: !u.active}, `${u.email} was ${u.active ? 'disabled' : 'enabled'}.`)
                        }
                      >
                        {u.active ? 'Disable' : 'Enable'}
                      </Btn>
                    )}
                    {!self && (
                      <Btn size="sm" kind="danger" onClick={() => confirmRemove(u)}>
                        Delete
                      </Btn>
                    )}
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ul>

      {inviting && roles && (
        <InviteSheet
          roles={roles}
          onClose={() => setInviting(false)}
          onDone={(u, pw) => {
            add(u);
            setInviting(false);
            toast.success(
              `${u.email} was added (${roleNames(u)}). Temporary password: ${pw} — share it privately; they can change it under “Account management”.`,
              SHARE
            );
          }}
        />
      )}
      {editingRoles && roles && (
        <RolesSheet
          user={editingRoles}
          roles={roles}
          onClose={() => setEditingRoles(null)}
          onSave={async roleIds => {
            const ok = await update(editingRoles, {roleIds}, `${editingRoles.email}’s roles were saved.`);
            if (ok) setEditingRoles(null);
          }}
        />
      )}
      {resetting && (
        <ResetSheet
          user={resetting}
          onClose={() => setResetting(null)}
          onDone={pw => {
            toast.success(`New password for ${resetting.email}: ${pw} — share it privately.`, SHARE);
            setResetting(null);
          }}
        />
      )}
    </div>
  );
}

/* tick any number of roles; ones this user may not hand out are shown but locked, with the reason */
function RolePicker({roles, value, onChange}: {roles: Role[]; value: string[]; onChange: (ids: string[]) => void}) {
  const me = useCurrentUser();
  return (
    <fieldset className="grid gap-[8px] m-0 p-0 border-0">
      <legend className="text-[12px] text-muted font-semibold mb-[8px]">Roles (any number)</legend>
      {roles.map(r => {
        const on = value.includes(r.id);
        const reason = lockedReason(me, r);
        return (
          <label
            key={r.id}
            className={cx(
              'flex items-start gap-[12px] rounded-[12px] border py-[12px] px-[14px]',
              on ? 'border-pink bg-surface' : 'border-line',
              reason ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
            )}
          >
            <input
              type="checkbox"
              className="w-[18px] h-[18px] mt-[2px] accent-[#E05CB5]"
              checked={on}
              disabled={!!reason}
              onChange={e => onChange(e.target.checked ? [...value, r.id] : value.filter(id => id !== r.id))}
            />
            <span className="min-w-0">
              <b className="text-[14px]">{r.name}</b>
              <span className="block text-[12.5px] text-muted">
                {r.system
                  ? 'Every page'
                  : r.pages.length
                    ? `${r.pages.length} page${r.pages.length > 1 ? 's' : ''}`
                    : 'No pages yet'}
                {r.description ? ` · ${r.description}` : ''}
              </span>
              {reason && <span className="block text-[12px] text-faint">{reason}</span>}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function RolesSheet({
  user,
  roles,
  onClose,
  onSave
}: {
  user: AdminUser;
  roles: Role[];
  onClose: () => void;
  onSave: (roleIds: string[]) => Promise<void>;
}) {
  const [value, setValue] = useState(user.roles.map(r => r.id));
  const [saving, setSaving] = useState(false);
  return (
    <Sheet
      title={`Roles: ${user.name || user.email}`}
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            kind="primary"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave(value);
              setSaving(false);
            }}
          >
            {saving ? 'Saving…' : 'Save roles'}
          </Btn>
        </>
      }
    >
      <div className="grid gap-[14px]">
        <p className="m-0 text-muted text-[14px]">
          They get every page any of these roles allows. With no role they can only open Account management.
        </p>
        <RolePicker roles={roles} value={value} onChange={setValue} />
      </div>
    </Sheet>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  hint
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-[8px]">
        <Input required minLength={10} value={value} onChange={e => onChange(e.target.value)} className="font-mono" />
        <Btn size="sm" onClick={() => onChange(tempPassword())}>
          New
        </Btn>
      </div>
    </Field>
  );
}

function InviteSheet({
  roles,
  onClose,
  onDone
}: {
  roles: Role[];
  onClose: () => void;
  onDone: (u: AdminUser, password: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [password, setPassword] = useState(tempPassword);
  const creating = useMutation(usersApi.create);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = await creating.run({email: email.trim(), name: name.trim(), roleIds, password});
    if (r.ok) onDone(r.data, password);
  }

  return (
    <Sheet
      title="Add employee"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" type="submit" form="invite-form" disabled={creating.pending}>
            {creating.pending ? 'Adding…' : 'Add employee'}
          </Btn>
        </>
      }
    >
      <form id="invite-form" onSubmit={submit} className="grid gap-[16px]">
        {creating.error && <Alert>{creating.error}</Alert>}
        <Field label="Email">
          <Input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
        </Field>
        <Field label="Name">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Optional" />
        </Field>
        <RolePicker roles={roles} value={roleIds} onChange={setRoleIds} />
        <PasswordField
          label="Temporary password"
          value={password}
          onChange={setPassword}
          hint="At least 10 characters. You’ll see it again after saving, so you can share it."
        />
      </form>
    </Sheet>
  );
}

function ResetSheet({
  user,
  onClose,
  onDone
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: (password: string) => void;
}) {
  const [password, setPassword] = useState(tempPassword);
  const resetting = useMutation((pw: string) => usersApi.update(user.id, {password: pw}));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = await resetting.run(password);
    if (r.ok) onDone(password);
  }

  return (
    <Sheet
      title="Reset password"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn kind="primary" type="submit" form="reset-form" disabled={resetting.pending}>
            {resetting.pending ? 'Saving…' : 'Set new password'}
          </Btn>
        </>
      }
    >
      <form id="reset-form" onSubmit={submit} className="grid gap-[16px]">
        <p className="m-0 text-muted text-[14px]">
          For <b className="text-ink">{user.email}</b>. They will be signed out everywhere.
        </p>
        {resetting.error && <Alert>{resetting.error}</Alert>}
        <PasswordField label="New password" value={password} onChange={setPassword} hint="At least 10 characters." />
      </form>
    </Sheet>
  );
}
