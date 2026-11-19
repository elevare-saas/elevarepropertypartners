import {use} from 'react';
import {AuthContext} from '@/context/auth/AuthContext';
import {canAccess} from '@/lib/roles';
import type {AdminUser, PageKey} from '@/types/admin';

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

/* whether the signed-in user's roles grant this dashboard page */
export function useCanAccess(page: PageKey) {
  return canAccess(useAuth().user, page);
}
