export const PATHS = {
  login: '/admin-login',
  dashboard: '/admin-dashboard'
} as const;

/* "/Admin", "/admin/", "/admin_login", "/admin/dashboard"… → the real admin path; null for the public site */
export function adminPathFor(pathname: string): string | null {
  const path = pathname.toLowerCase().replace(/\/+$/, '');
  if (!/^\/admin([-_/]|$)/.test(path)) return null;
  return /login|sign-?in/.test(path) ? PATHS.login : PATHS.dashboard;
}
