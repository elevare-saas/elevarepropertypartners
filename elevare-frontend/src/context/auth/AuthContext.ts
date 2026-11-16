import {createContext} from 'react';
import type {AdminUser, Credentials} from '@/types/admin';

export type AuthStatus = 'authenticated' | 'unauthenticated';

export interface AuthValue {
  status: AuthStatus;
  /* null unless authenticated */
  user: AdminUser | null;
  /* for the sign-in page, e.g. "Your session has ended" */
  notice: string;
  /* rejects with an ApiError (wrong details, rate limit, server down) */
  login: (credentials: Credentials) => Promise<AdminUser>;
  logout: () => Promise<void>;
  updateUser: (user: AdminUser) => void;
}

export const AuthContext = createContext<AuthValue | null>(null);
