import type {NextFunction, Request, Response} from 'express';
import {sessionForToken, sessionToken} from '../lib/sessions.js';
import {canAccess, type User} from '../lib/roles.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    sessionExpiresAt?: Date;
  }
}

export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const t = sessionToken(req);
  const session = t ? await sessionForToken(t) : undefined;
  req.user = session?.user;
  req.sessionExpiresAt = session?.expiresAt;
  next();
}

export const requireLogin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({error: 'Please sign in.'});
  next();
};

/* the user's roles must grant this dashboard page (lib/roles.ts → PAGES) */
export const requirePage = (page: string) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({error: 'Please sign in.'});
  if (!canAccess(req.user, page)) return res.status(403).json({error: 'You don’t have access to this page.'});
  next();
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({error: 'Please sign in.'});
  if (!req.user.superAdmin) return res.status(403).json({error: 'Only a Super Admin can do this.'});
  next();
};
