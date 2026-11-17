/* for uptime checks: 503 when the database is down */
import {Router} from 'express';
import {pingDb} from '../db/pg.js';

export const healthRouter = Router();
healthRouter.get('/', async (_req, res) => {
  const database = await pingDb();
  res.status(database === 'up' ? 200 : 503).json({ok: database === 'up', database});
});
