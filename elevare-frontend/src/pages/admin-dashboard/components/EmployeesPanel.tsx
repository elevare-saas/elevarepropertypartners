/* Super Admin only (the server enforces it too) */
import {useState, type FormEvent} from 'react';
import {Alert, Badge, Btn, Card, Field, Input, Select, Sheet} from '@/components/admin/kit';
import {useCurrentUser} from '@/hooks/useAuth';
import {useMutation} from '@/hooks/useMutation';
import {useToast} from '@/hooks/useToast';
import {when} from '@/lib/format';
import {ROLE_DESC, ROLE_LABEL, ROLES} from '@/lib/roles';
import {usersApi} from '@/services/usersApi';
import type {AdminUser, Role} from '@/types/admin';
import {useTeam} from '@/pages/admin-dashboard/hooks/useTeam';

const tempPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(14)), x => alphabet[x % alphabet.length]).join('');
};
/* stays until closed so it can be copied */
const SHARE = {persist: true};

export default function EmployeesPanel() {
  const me = useCurrentUser();
  const toast = useToast();
  const {members, error, add, update, remove} = useTeam();
  const [inviting, setInviting] = useState(false);
  const [resetting, setResetting] = useState<AdminUser | null>(null);

  function confirmRemove(u: AdminUser) {
    if (confirm(`Delete ${u.email}? They will lose access immediately.`)) void remove(u);
  }

  return (
    <section className="grid gap-[22px]">
      <div className="flex items-end justify-between gap-[16px] flex-wrap">
        <div>
          <h1 className="text-[clamp(32px,5vw,44px)]">Employees management</h1>
          <p className="text-muted m-0 mt-[4px] text-[14px]">
            Who can sign in to the dashboard, and what each person can do.
          </p>
        </div>
        <Btn kind="primary" onClick={() => setInviting(true)}>
          + Add employee
        </Btn>
      </div>

      <div className="grid grid-cols-3 upto759:grid-cols-1 gap-[12px]">
        {ROLES.map(r => (
          <Card key={r} className="py-[14px] px-[16px]">
            <b className="text-[14px]">{ROLE_LABEL[r]}</b>
            <div className="text-[12.5px] text-muted mt-[2px]">{ROLE_DESC[r]}</div>
          </Card>
        ))}
      </div>

      {error && <Alert>{error.message}</Alert>}
      {!members && !error && <p className="text-muted">Loading employees…</p>}

      <ul className="list-none m-0 p-0 grid gap-[10px]">
        {members?.map(u => {
          const self = u.id === me.id;
          return (
            <li key={u.id}>
              <Card
                className={
                  'p-[14px] grid grid-cols-[minmax(0,1fr)_200px_auto] upto759:grid-cols-1 gap-[14px] items-center ' +
                  (u.active ? '' : 'opacity-70')
                }
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-[8px] flex-wrap">
                    <b className="text-[15px]">{u.name || u.email}</b>
                    {self && <Badge tone="violet">You</Badge>}
                    {!u.active && <Badge>Disabled</Badge>}
                  </div>
                  <div className="text-[13px] text-muted truncate">{u.email}</div>
                  <div className="text-[12px] text-faint">Last sign-in {when(u.lastLoginAt)}</div>
                </div>
                <Select
                  value={u.role}
                  disabled={self}
                  aria-label={`Role of ${u.email}`}
                  onChange={e => {
                    const role = e.target.value as Role;
                    void update(u, {role}, `${u.email} is now ${ROLE_LABEL[role]}.`);
                  }}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-[6px] flex-wrap justify-end upto759:justify-start">
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
              </Card>
            </li>
          );
        })}
      </ul>

      {inviting && (
        <InviteSheet
          onClose={() => setInviting(false)}
          onDone={(u, pw) => {
            add(u);
            setInviting(false);
            toast.success(
              `${u.email} was added as ${ROLE_LABEL[u.role]}. Temporary password: ${pw} — share it privately; they can change it under “Account management”.`,
              SHARE
            );
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
    </section>
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

function InviteSheet({onClose, onDone}: {onClose: () => void; onDone: (u: AdminUser, password: string) => void}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('marketing_manager');
  const [password, setPassword] = useState(tempPassword);
  const creating = useMutation(usersApi.create);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const r = await creating.run({email: email.trim(), name: name.trim(), role, password});
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
        <Field label="Role" hint={ROLE_DESC[role]}>
          <Select value={role} onChange={e => setRole(e.target.value as Role)}>
            {ROLES.map(r => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
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
