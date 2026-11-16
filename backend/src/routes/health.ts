/* for uptime checks: 503 when MongoDB is down */
import {Router} from 'express';
import {pingMongo} from '../db/mongo.js';

export const healthRouter = Router();
healthRouter.get('/', async (_req, res) => {
  const mongodb = await pingMongo();
  res.status(mongodb === 'up' ? 200 : 503).json({ok: mongodb === 'up', mongodb});
});
