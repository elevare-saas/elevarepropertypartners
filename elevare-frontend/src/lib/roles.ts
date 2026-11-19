/* the UI only hides what a user can't open; the server enforces it */
import type {AdminUser, PageKey} from '@/types/admin';

export const canAccess = (user: AdminUser | null | undefined, page: PageKey) => !!user?.pages.includes(page);

/* "Marketing Manager, Sales" or "No role" */
export const roleNames = (user: Pick<AdminUser, 'roles'>) => user.roles.map(r => r.name).join(', ') || 'No role';
