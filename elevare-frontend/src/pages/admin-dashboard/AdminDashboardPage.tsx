/* Sidebar layout. The open section lives in the URL (?section=employees), so refreshes and shared links keep it.
   Below 1000px the sidebar becomes a drawer opened from the top bar. */
import {useState, type ReactNode} from 'react';
import {Badge, Brand, Btn} from '@/components/admin/kit';
import {useAuth, useCurrentUser, usePermission} from '@/hooks/useAuth';
import {useDocumentTitle, useEscapeKey, useLockBodyScroll} from '@/hooks/useDocument';
import {useSearchParam} from '@/hooks/useRouter';
import {cx} from '@/lib/format';
import {ROLE_LABEL, ROLE_TONE} from '@/lib/roles';
import AccountPanel from './components/AccountPanel';
import EmployeesPanel from './components/EmployeesPanel';
import PropertiesPanel from './components/PropertiesPanel';

type Section = 'properties' | 'employees' | 'account';

const icon = (d: string) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
  >
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SECTIONS: Record<Section, {label: string; icon: ReactNode; panel: () => ReactNode}> = {
  properties: {
    label: 'Properties management',
    icon: icon('M3 10.5 12 3l9 7.5M5 9v11h14V9M9.5 20v-6h5v6'),
    panel: () => <PropertiesPanel />
  },
  employees: {
    label: 'Employees management',
    icon: icon(
      'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M21 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8'
    ),
    panel: () => <EmployeesPanel />
  },
  account: {
    label: 'Account management',
    icon: icon('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 20a8 8 0 0 1 16 0'),
    panel: () => <AccountPanel />
  }
};

export default function AdminDashboardPage() {
  const user = useCurrentUser();
  const {logout} = useAuth();
  const canManageEmployees = usePermission('users.manage');
  const sections: Section[] = canManageEmployees ? ['properties', 'employees', 'account'] : ['properties', 'account'];

  const [param, setParam] = useSearchParam('section');
  const section: Section = sections.includes(param as Section) ? (param as Section) : 'properties';
  useDocumentTitle(`${SECTIONS[section].label} · Elevare Admin`);

  const [menuOpen, setMenuOpen] = useState(false);
  useEscapeKey(() => setMenuOpen(false));
  useLockBodyScroll(menuOpen);

  function open(next: Section) {
    setParam(next === 'properties' ? null : next);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }

  return (
    <div className="min-h-screen relative z-[1]">
      {/* top bar: small screens only */}
      <header className="hidden upto999:flex sticky top-0 z-30 h-[60px] items-center gap-[12px] px-[16px] bg-[rgba(5,4,9,.92)] backdrop-blur-[12px] border-b border-line">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="admin-sidebar"
          className="w-[40px] h-[40px] grid place-items-center rounded-[10px] bg-surface-2 border border-line text-ink cursor-pointer"
        >
          {icon('M4 7h16M4 12h16M4 17h16')}
        </button>
        <span className="text-[14px] font-semibold truncate">{SECTIONS[section].label}</span>
      </header>

      {menuOpen && (
        <div className="hidden upto999:block fixed inset-0 z-40 bg-black/60" onClick={() => setMenuOpen(false)} />
      )}

      <aside
        id="admin-sidebar"
        aria-label="Dashboard"
        className={cx(
          'fixed top-0 left-0 z-50 h-dvh w-[272px] flex flex-col bg-surface border-r border-line',
          'transition-transform duration-200 upto999:shadow-[0_0_60px_rgba(0,0,0,.6)]',
          menuOpen ? 'translate-x-0' : 'upto999:-translate-x-full'
        )}
      >
        <div className="h-[76px] px-[22px] flex items-center justify-between border-b border-line">
          <Brand />
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="hidden upto999:grid w-[34px] h-[34px] place-items-center rounded-[8px] bg-transparent border-0 text-muted hover:text-ink cursor-pointer"
          >
            {icon('M6 6l12 12M18 6 6 18')}
          </button>
        </div>

        <nav aria-label="Dashboard sections" className="flex-1 overflow-y-auto p-[14px] grid content-start gap-[4px]">
          <div className="px-[10px] pt-[6px] pb-[8px] text-[10.5px] tracking-[.18em] uppercase text-faint font-semibold">
            Management
          </div>
          {sections.map(s => (
            <button
              key={s}
              type="button"
              aria-current={section === s ? 'page' : undefined}
              onClick={() => open(s)}
              className={cx(
                'flex items-center gap-[12px] w-full text-left py-[11px] px-[12px] rounded-[10px] border text-[14px] cursor-pointer',
                section === s
                  ? 'bg-surface-2 border-line text-ink font-semibold [&>svg]:text-pink'
                  : 'bg-transparent border-transparent text-muted hover:text-ink hover:bg-surface-2'
              )}
            >
              {SECTIONS[s].icon}
              {SECTIONS[s].label}
            </button>
          ))}
        </nav>

        <div className="p-[14px] border-t border-line grid gap-[12px]">
          <div className="flex items-center gap-[10px] min-w-0">
            <span className="w-[38px] h-[38px] shrink-0 rounded-full bg-grad grid place-items-center text-white font-semibold uppercase">
              {(user.name || user.email).charAt(0)}
            </span>
            <div className="min-w-0">
              <div className="text-[13.5px] font-semibold truncate">{user.name || user.email}</div>
              <div className="mt-[3px]">
                <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-[8px]">
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="text-center no-underline rounded-full py-[7px] text-[12.5px] font-semibold text-muted border border-line hover:text-ink"
            >
              Website ↗
            </a>
            <Btn size="sm" onClick={() => void logout()}>
              Sign out
            </Btn>
          </div>
        </div>
      </aside>

      <main className="ml-[272px] upto999:ml-0 min-w-0">
        <div className="max-w-[1200px] mx-auto px-[32px] upto759:px-[20px] upto480:px-[16px] py-[32px] pb-[60px]">
          {SECTIONS[section].panel()}
        </div>
      </main>
    </div>
  );
}
