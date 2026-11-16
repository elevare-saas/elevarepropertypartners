import {use} from 'react';
import {AuthContext} from '@/context/auth/AuthContext';
import {can} from '@/lib/roles';
import type {AdminUser, Permission} from '@/types/admin';

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>.');
  return auth;
}

/* for components behind <RequireAuth>, where it always exists */
export function useCurrentUser(): AdminUser {
  const {user} = useAuth();
  if (!user) throw new Error('useCurrentUser needs a signed-in user: render this component inside <RequireAuth>.');
  return user;
}

export function usePermission(permission: Permission) {
  return can(useAuth().user, permission);
}
