/* the UI only hides what a role can't use; the server enforces the rules */
import type {AdminUser, Permission, Role} from '@/types/admin';

export const ROLES: readonly Role[] = ['super_admin', 'marketing_manager', 'viewer'];

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Super Admin',
  marketing_manager: 'Marketing Manager',
  viewer: 'Viewer'
};

export const ROLE_DESC: Record<Role, string> = {
  super_admin: 'Everything, including the team and their roles',
  marketing_manager: 'Add, edit, publish and remove properties',
  viewer: 'Read-only access to the properties'
};

export const ROLE_TONE: Record<Role, 'pink' | 'violet' | 'muted'> = {
  super_admin: 'pink',
  marketing_manager: 'violet',
  viewer: 'muted'
};

export const can = (user: AdminUser | null | undefined, permission: Permission) =>
  !!user?.permissions.includes(permission);
