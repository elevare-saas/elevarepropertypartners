import type {NextFunction, Request, Response} from 'express';
import {sessionForToken, sessionToken} from '../lib/sessions.js';
import {permissionsOf, type Permission, type User} from '../lib/roles.js';

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

export const requirePermission = (p: Permission) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({error: 'Please sign in.'});
  if (!permissionsOf(req.user.role).includes(p)) return res.status(403).json({error: 'Your role does not allow this.'});
  next();
};
