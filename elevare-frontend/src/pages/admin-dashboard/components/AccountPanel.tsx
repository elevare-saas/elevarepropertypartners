import {useState, type FormEvent} from 'react';
import {Alert, Btn, Card, Field, Input} from '@/components/admin/kit';
import {useCurrentUser} from '@/hooks/useAuth';
import {useMutation} from '@/hooks/useMutation';
import {useToast} from '@/hooks/useToast';
import {when} from '@/lib/format';
import {roleNames} from '@/lib/roles';
import type {PageKey} from '@/types/admin';

const PAGE_LABEL: Record<PageKey, string> = {properties: 'Properties management', employees: 'Employees management'};
import {authApi} from '@/services/authApi';

export default function AccountPanel() {
  const user = useCurrentUser();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const changing = useMutation(authApi.changePassword);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMismatch(next !== again);
    if (next !== again) return;
    const r = await changing.run(current, next);
    if (!r.ok) return;
    setCurrent('');
    setNext('');
    setAgain('');
    toast.success('Password changed. Your other devices were signed out.');
  }

  const error = mismatch ? 'The new passwords do not match.' : changing.error;

  return (
    <section className="grid gap-[22px] max-w-[640px]">
      <h1 className="text-[clamp(32px,5vw,44px)]">Account management</h1>
      <Card className="p-[18px] grid gap-[6px] text-[14px]">
        <div>
          <span className="text-muted">Name:</span> {user.name || '—'}
        </div>
        <div>
          <span className="text-muted">Email:</span> {user.email}
        </div>
        <div>
          <span className="text-muted">{user.roles.length > 1 ? 'Roles' : 'Role'}:</span> <b>{roleNames(user)}</b>
        </div>
        <div>
          <span className="text-muted">Pages you can open:</span>{' '}
          {user.superAdmin ? 'every page' : [...user.pages.map(p => PAGE_LABEL[p]), 'Account management'].join(', ')}
        </div>
        <div>
          <span className="text-muted">Member since:</span> {when(user.createdAt)}
        </div>
      </Card>

      <form onSubmit={submit} className="grid gap-[14px]">
        <h2 className="text-[26px]">Change password</h2>
        {error && <Alert>{error}</Alert>}
        <Field label="Current password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={e => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="New password" hint="At least 10 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={10}
            value={next}
            onChange={e => setNext(e.target.value)}
          />
        </Field>
        <Field label="Repeat new password">
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={again}
            onChange={e => setAgain(e.target.value)}
          />
        </Field>
        <Btn
          kind="primary"
          type="submit"
          disabled={changing.pending || !current || !next}
          className="justify-self-start"
        >
          {changing.pending ? 'Saving…' : 'Change password'}
        </Btn>
      </form>
    </section>
  );
}
