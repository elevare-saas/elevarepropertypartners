/* the role comes from the account, not from anything chosen here */
import {useState, type FormEvent} from 'react';
import {Alert, Brand, Btn, Field, Input} from '@/components/admin/kit';
import {useAuth} from '@/hooks/useAuth';
import {useDocumentTitle} from '@/hooks/useDocument';
import {useMutation} from '@/hooks/useMutation';

export default function AdminLoginPage() {
  useDocumentTitle('Sign in · Elevare Admin');
  const {login, notice} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const signIn = useMutation(login);
  const {error, pending: busy} = signIn;

  async function submit(e: FormEvent) {
    e.preventDefault();
    await signIn.run({email, password});
  }

  return (
    <main className="min-h-screen grid place-items-center px-[16px] py-[40px] relative z-[1]">
      <div className="w-full max-w-[420px] grid gap-[22px]">
        <a href="/" className="justify-self-center no-underline text-inherit" aria-label="Back to the Elevare website">
          <Brand sub="PROPERTY PARTNERS" />
        </a>

        <form
          onSubmit={submit}
          className="bg-surface border border-line rounded-[18px] p-[28px] grid gap-[16px] upto480:p-[20px]"
          noValidate
        >
          <div>
            <div className="text-[11px] tracking-[.2em] uppercase text-muted font-semibold">Admin</div>
            <h1 className="text-[36px] mt-[4px]">Sign in</h1>
            <p className="text-muted text-[13.5px] mt-[6px] mb-0">
              For the Elevare team. Your access depends on the role your administrator gave you.
            </p>
          </div>

          {notice && !error && <Alert kind="info">{notice}</Alert>}
          {error && <Alert>{error}</Alert>}

          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@elevarepropertypartners.com"
            />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pr-[64px]"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                aria-pressed={show}
                className="absolute right-[8px] top-1/2 -translate-y-1/2 border-0 bg-transparent text-muted text-[12px] cursor-pointer hover:text-ink"
              >
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>

          <Btn kind="primary" type="submit" disabled={busy || !email || !password} className="mt-[4px]">
            {busy ? 'Signing in…' : 'Sign in →'}
          </Btn>
          <p className="text-faint text-[12px] m-0 text-center">Forgot your password? Ask a Super Admin to reset it.</p>
        </form>

        <a href="/" className="justify-self-center text-muted text-[13px]">
          ← Back to the website
        </a>
      </div>
    </main>
  );
}
