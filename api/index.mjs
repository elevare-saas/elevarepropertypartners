/* Vercel function: the whole backend (backend/dist) behind one handler.
   vercel.json sends /api/*, /uploads/*, /sitemap.xml and every page that isn't a static file here; the Express app
   routes them exactly as on a normal server. MongoDB is connected once per warm instance.
   Until MONGODB_URI is set (or while the database can't be reached), pages still get the website and the API
   answers 503, instead of the whole function failing. */
import {readFile} from 'node:fs/promises';

const SHELL = new URL('../elevare-frontend/dist/index.html', import.meta.url);
let backend; /* Promise<express app>, shared by requests on a warm instance */

/* imported lazily: the backend checks its settings on import and stops if MONGODB_URI is missing */
async function startBackend() {
  const [{createApp}, {connectMongo}, {ensureFirstAdmin, seedListings}] = await Promise.all([
    import('../backend/dist/app.js'),
    import('../backend/dist/db/mongo.js'),
    import('../backend/dist/db/seed.js')
  ]);
  const app = createApp();
  await connectMongo();
  await seedListings();
  await ensureFirstAdmin();
  return app;
}

async function notReady(req, res, reason) {
  console.error('Elevare backend not ready:', reason);
  const path = new URL(req.url, 'http://x').pathname;
  if (path.startsWith('/api/') || path === '/sitemap.xml' || req.method !== 'GET') {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Retry-After', '30');
    return res.end(JSON.stringify({error: 'This service is not available yet. Please try again later.'}));
  }
  /* any page: the website itself (it shows "listings unavailable" where homes would be) */
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(await readFile(SHELL, 'utf8'));
}

export default async function handler(req, res) {
  if (!process.env.MONGODB_URI) return notReady(req, res, 'MONGODB_URI is not set');
  backend ??= startBackend().catch(e => {
    backend = undefined; /* try again on the next request */
    throw e;
  });
  let app;
  try {
    app = await backend;
  } catch (e) {
    return notReady(req, res, e.message);
  }
  return app(req, res);
}
