import {useCallback} from 'react';
import {useQuery} from '@/hooks/useQuery';
import {useToast} from '@/hooks/useToast';
import {errorMessage} from '@/lib/http';
import {usersApi} from '@/services/usersApi';
import type {AdminUser, TeamMemberChanges} from '@/types/admin';

export function useTeam() {
  const toast = useToast();
  const {data: members, error, loading, setData} = useQuery('admin-users', usersApi.list);

  const replace = useCallback(
    (user: AdminUser) => setData(list => list?.map(u => (u.id === user.id ? user : u))),
    [setData]
  );
  const add = useCallback((user: AdminUser) => setData(list => [...(list ?? []), user]), [setData]);

  /* returns success, so the caller can e.g. undo a select */
  const update = useCallback(
    async (member: AdminUser, changes: TeamMemberChanges, success: string) => {
      try {
        replace(await usersApi.update(member.id, changes));
        toast.success(success);
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        return false;
      }
    },
    [replace, toast]
  );

  const remove = useCallback(
    async (member: AdminUser) => {
      try {
        await usersApi.remove(member.id);
        setData(list => list?.filter(u => u.id !== member.id));
        toast.success(`${member.email} was deleted.`);
      } catch (e) {
        toast.error(errorMessage(e));
      }
    },
    [setData, toast]
  );

  return {members, error, loading, add, update, remove};
}
