import {useCallback} from 'react';
import {useQuery} from '@/hooks/useQuery';
import {useToast} from '@/hooks/useToast';
import {errorMessage} from '@/lib/http';
import {rolesApi} from '@/services/rolesApi';
import type {Role, RoleInput} from '@/types/admin';

export function useRoles() {
  const toast = useToast();
  const {data, error, reload, setData} = useQuery('admin-roles', rolesApi.list);

  const put = useCallback(
    (role: Role) =>
      setData(
        d =>
          d && {
            ...d,
            roles: d.roles.some(r => r.id === role.id)
              ? d.roles.map(r => (r.id === role.id ? role : r))
              : [...d.roles, role]
          }
      ),
    [setData]
  );

  /* returns success, so the caller can close a sheet or undo a checkbox */
  const update = useCallback(
    async (role: Role, changes: Partial<RoleInput>, success: string) => {
      try {
        put(await rolesApi.update(role.id, changes));
        toast.success(success);
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        return false;
      }
    },
    [put, toast]
  );

  const remove = useCallback(
    async (role: Role) => {
      try {
        await rolesApi.remove(role.id);
        setData(d => d && {...d, roles: d.roles.filter(r => r.id !== role.id)});
        toast.success(`The role “${role.name}” was deleted.`);
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    [setData, toast]
  );

  return {roles: data?.roles, pages: data?.pages, error, reload, put, update, remove};
}
