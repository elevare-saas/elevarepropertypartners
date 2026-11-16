/* Vercel function: the whole backend (backend/dist) behind one handler.
   vercel.json sends /api/*, /uploads/*, /sitemap.xml and every page that isn't a static file here; the Express app
   routes them exactly as on a normal server. MongoDB is connected once per warm instance. */
import {createApp} from '../backend/dist/app.js';
import {connectMongo} from '../backend/dist/db/mongo.js';
import {ensureFirstAdmin, seedListings} from '../backend/dist/db/seed.js';

const app = createApp();
let ready;

export default async function handler(req, res) {
  ready ??= (async () => {
    await connectMongo();
    await seedListings();
    await ensureFirstAdmin();
  })().catch(e => {
    ready = undefined; /* try again on the next request */
    throw e;
  });
  try {
    await ready;
  } catch (e) {
    console.error('Elevare: database unavailable:', e.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Retry-After', '10');
    return res.end(JSON.stringify({error: 'The service is starting up. Please try again in a moment.'}));
  }
  return app(req, res);
}
