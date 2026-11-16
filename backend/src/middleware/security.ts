import type {NextFunction, Request, Response} from 'express';
import cors from 'cors';
import {env} from '../config/env.js';

/* only FRONTEND_URL and CORS_ORIGINS may call the API with cookies */
export const corsPolicy = cors({
  origin: (o, cb) => cb(null, !o || env.allowedOrigins.includes(o)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  maxAge: 600
});

/* CSRF: writes must come from an allowed origin or the API's own host */
export function sameOriginWrites(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.get('origin');
  if (!origin || env.allowedOrigins.includes(origin)) return next();
  let host = '';
  try {
    host = new URL(origin).host;
  } catch {
    /* "null" or malformed origin */
  }
  if (host !== req.get('host') && host !== req.get('x-forwarded-host'))
    return res.status(403).json({error: 'Cross-site request refused.'});
  next();
}

/* safe defaults for every response; HSTS only in production (HTTPS) */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  });
  if (env.isProd) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}
