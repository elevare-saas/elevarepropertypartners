import type {ReactNode} from 'react';
import {useAuth} from '@/hooks/useAuth';
import {Navigate} from './Navigate';
import {PATHS} from './paths';

/* no stored session → sign-in page, straight away */
export function RequireAuth({children}: {children: ReactNode}) {
  return useAuth().status === 'authenticated' ? children : <Navigate to={PATHS.login} />;
}

/* already signed in → dashboard */
export function GuestOnly({children}: {children: ReactNode}) {
  return useAuth().status === 'authenticated' ? <Navigate to={PATHS.dashboard} /> : children;
}
