import {one} from '../db/pg.js';

/* Who may open which dashboard page. The CEO (Super Admin) creates roles and ticks their pages; an employee can have
   several roles and gets every page any of them allows. Enforced here on every request; the dashboard only hides
   what a user can't open. */

/* every dashboard page that can be granted. Account management is always open to everyone signed in.
   A new page: add it here (and to the frontend sidebar); it appears in the role editor, granted to no role yet. */
export const PAGES = [
  {key: 'properties', label: 'Properties management', description: 'Add, edit, publish and remove properties'},
  {key: 'employees', label: 'Employees management', description: 'Add employees, give them roles, reset passwords'},
  {key: 'settings', label: 'Website settings', description: 'Areas, market estimates and contact details'}
] as const;
export type PageKey = (typeof PAGES)[number]['key'];
const PAGE_KEYS: readonly string[] = PAGES.map(p => p.key);
export const isPageKey = (k: unknown): k is PageKey => typeof k === 'string' && PAGE_KEYS.includes(k);

export interface RoleRef {
  id: string;
  name: string;
  system: boolean; // the built-in Super Admin role: every page, can't be edited or deleted
  pages: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  active: boolean;
  createdAt: Date | null;
  lastLoginAt: Date | null;
  roles: RoleRef[];
  superAdmin: boolean;
  /* the pages this user may open (all of them for a Super Admin) */
  pages: PageKey[];
}

/* an admin row with its roles (see ADMIN_SELECT) */
export interface AdminWithRoles {
  id: string;
  email: string;
  name: string;
  active: boolean;
  createdAt: Date | null;
  lastLoginAt: Date | null;
  roles: RoleRef[];
}

/* one admin per row with its roles as JSON; finish with `where … group by a.id` (plus any extra columns) */
export const adminSelect = (extraColumns = '') => `
  select a.id, a.email, a.name, a.active, a.created_at as "createdAt", a.last_login_at as "lastLoginAt",
         coalesce(json_agg(json_build_object('id', r.id, 'name', r.name, 'system', r.system, 'pages', r.pages)
                           order by r.system desc, r.name) filter (where r.id is not null), '[]'::json) as roles
         ${extraColumns}
    from admins a
    left join admin_roles ar on ar.admin_id = a.id
    left join roles r on r.id = ar.role_id`;

export function toUser(a: AdminWithRoles): User {
  const superAdmin = a.roles.some(r => r.system);
  const granted = new Set(a.roles.flatMap(r => r.pages));
  return {
    id: a.id,
    email: a.email,
    name: a.name ?? '',
    active: a.active !== false,
    createdAt: a.createdAt ?? null,
    lastLoginAt: a.lastLoginAt ?? null,
    roles: a.roles.map(({id, name, system, pages}) => ({id, name, system, pages})),
    superAdmin,
    pages: PAGES.map(p => p.key).filter(k => superAdmin || granted.has(k))
  };
}

/* Super Admins can open every page, including future ones not listed in PAGES (e.g. "leads") */
export const canAccess = (u: Pick<User, 'superAdmin' | 'pages'>, page: string) =>
  u.superAdmin || (u.pages as string[]).includes(page);

/* never includes the password hash */
export const publicUser = (u: User) => u;

export async function loadUser(id: string): Promise<User | undefined> {
  const a = await one<AdminWithRoles>(`${adminSelect()} where a.id = $1 group by a.id`, [id]);
  return a ? toUser(a) : undefined;
}
