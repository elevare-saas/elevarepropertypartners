/* Super Admin only; the server enforces it */
import {request} from '@/lib/http';
import type {AdminUser, NewTeamMember, TeamMemberChanges} from '@/types/admin';

const base = '/admin/users';
const one = (r: {user: AdminUser}) => r.user;
const path = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const usersApi = {
  list: (signal?: AbortSignal) => request<{users: AdminUser[]}>(base, {signal}).then(r => r.users),
  create: (member: NewTeamMember) => request<{user: AdminUser}>(base, {body: member}).then(one),
  update: (id: string, changes: TeamMemberChanges) =>
    request<{user: AdminUser}>(path(id), {method: 'PATCH', body: changes}).then(one),
  remove: (id: string) => request<{ok: true}>(path(id), {method: 'DELETE'})
};
