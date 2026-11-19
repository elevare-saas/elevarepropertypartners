/* no side effects, so tests can import it */
import express from 'express';
import cookieParser from 'cookie-parser';
import {env} from './config/env.js';
import {loadUser} from './middleware/auth.js';
import {errorHandler, notFound, requestLog} from './middleware/errors.js';
import {corsPolicy, sameOriginWrites, securityHeaders} from './middleware/security.js';
import {authRouter} from './routes/auth.js';
import {healthRouter} from './routes/health.js';
import {adminLeads, publicLeads} from './routes/leads.js';
import {adminListings, publicListings} from './routes/listings.js';
import {seoRouter, serveFrontend} from './routes/seo.js';
import {rolesRouter} from './routes/roles.js';
import {usersRouter} from './routes/users.js';

const trustProxy = (v: string) => (v === 'true' ? true : v === 'false' ? false : /^\d+$/.test(v) ? Number(v) : v);

export function createApp() {
  const app = express();
  app.set('trust proxy', trustProxy(env.trustProxy));
  app.disable('x-powered-by');

  app.use(requestLog);
  app.use(securityHeaders);
  app.use(['/api', '/uploads'], corsPolicy);
  app.use(express.json({limit: env.limits.jsonBody}));
  app.use(cookieParser(env.session.secret));
  app.use('/api', sameOriginWrites);
  app.use(loadUser);

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/listings', publicListings);
  app.use('/api/leads', publicLeads);
  app.use('/api/admin/listings', adminListings);
  app.use('/api/admin/leads', adminLeads);
  app.use('/api/admin/users', usersRouter);
  app.use('/api/admin/roles', rolesRouter);
  app.use('/uploads', express.static(env.limits.uploadDir, {maxAge: '30d', immutable: true}));
  app.use(seoRouter);
  serveFrontend(app);

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
