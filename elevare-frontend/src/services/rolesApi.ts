/* /api/admin/roles: Roles & access (reading needs Employees access; changes are Super Admin only) */
import {request} from '@/lib/http';
import type {PageInfo, Role, RoleInput} from '@/types/admin';

const base = '/admin/roles';
const path = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const rolesApi = {
  list: (signal?: AbortSignal) => request<{roles: Role[]; pages: PageInfo[]}>(base, {signal}),
  create: (input: RoleInput) => request<{role: Role}>(base, {body: input}).then(r => r.role),
  update: (id: string, changes: Partial<RoleInput>) =>
    request<{role: Role}>(path(id), {method: 'PATCH', body: changes}).then(r => r.role),
  remove: (id: string) => request<{ok: true; members: number}>(path(id), {method: 'DELETE'})
};
