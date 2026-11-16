import type {NextFunction, Request, Response} from 'express';
import {log} from '../lib/logger.js';

export const notFound = (_req: Request, res: Response) => res.status(404).json({error: 'Not found.'});

/* "GET /api/listings 200 12ms" */
export function requestLog(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms`;
    if (res.statusCode >= 500) log.error(line);
    else if (req.originalUrl.split('?')[0] === '/api/health') log.debug(line);
    else log.info(line);
  });
  next();
}

/* Express 5 forwards errors thrown in async handlers here */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const e = err as {type?: string; status?: number};
  if (e?.type === 'entity.parse.failed') return res.status(400).json({error: 'Invalid JSON body.'});
  if (e?.type === 'entity.too.large') return res.status(413).json({error: 'Request body is too large.'});
  log.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({error: 'Something went wrong on the server.'});
}
