import type {AdminDoc} from '../db/mongo.js';
/* enforced here on every request; the dashboard only hides what a role can't use */
const ROLES = ['super_admin', 'marketing_manager', 'viewer'] as const;
export type Role = (typeof ROLES)[number];
export const isRole = (r: unknown): r is Role => ROLES.includes(r as Role);

const PERMISSIONS = {
  'listings.view': ['super_admin', 'marketing_manager', 'viewer'],
  'listings.edit': ['super_admin', 'marketing_manager'],
  /* leads hold visitors' personal details, so viewers don't see them */
  'leads.view': ['super_admin', 'marketing_manager'],
  'leads.edit': ['super_admin', 'marketing_manager'],
  'users.manage': ['super_admin']
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof PERMISSIONS;

export const permissionsOf = (role: Role) =>
  (Object.keys(PERMISSIONS) as Permission[]).filter(p => (PERMISSIONS[p] as readonly Role[]).includes(role));

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: Date | null;
  lastLoginAt: Date | null;
}
export const toUser = (d: Omit<AdminDoc, 'password'>): User => ({
  id: d._id.toHexString(),
  email: d.email,
  name: d.name ?? '',
  role: d.role,
  active: d.active !== false,
  createdAt: d.createdAt ?? null,
  lastLoginAt: d.lastLoginAt ?? null
});
/* never includes the password hash */
export const publicUser = (u: User) => ({...u, permissions: permissionsOf(u.role)});
