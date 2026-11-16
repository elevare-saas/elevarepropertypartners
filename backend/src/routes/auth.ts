import {Router} from 'express';
import {ObjectId} from 'mongodb';
import {col} from '../db/mongo.js';
import {requireLogin} from '../middleware/auth.js';
import {checkPassword, hashPassword, passwordProblem} from '../lib/passwords.js';
import {loginLimiter} from '../lib/rateLimit.js';
import {log} from '../lib/logger.js';
import {publicUser} from '../lib/roles.js';
import {normalizeEmail, verifyCredentials} from '../services/authService.js';
import {endAllSessions, endSession, startSession} from '../lib/sessions.js';

export const authRouter = Router();

/* {email, password} → 200 {user, expiresAt} + session cookie | 400 | 401 | 429 */
authRouter.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) return res.status(400).json({error: 'Enter your email and password.'});

  const key = `${email}|${req.ip}`;
  if (loginLimiter.blocked(key)) return res.status(429).json({error: 'Too many attempts. Try again later.'});

  const result = await verifyCredentials(email, password);
  if (!result.ok) {
    loginLimiter.hit(key);
    log.info(`Sign-in refused for ${email} (${result.reason}) from ${req.ip}`);
    /* same message for every reason, so it doesn't reveal which emails exist */
    return res.status(401).json({error: 'Email or password is incorrect.'});
  }

  loginLimiter.reset(key);
  const expiresAt = await startSession(res, result.user.id);
  res.json({user: publicUser(result.user), expiresAt});
});

authRouter.post('/logout', async (req, res) => {
  await endSession(req, res);
  res.json({ok: true});
});

authRouter.get('/me', requireLogin, (req, res) => {
  res.json({user: publicUser(req.user!), expiresAt: req.sessionExpiresAt});
});

authRouter.post('/password', requireLogin, async (req, res) => {
  const {current, next} = req.body ?? {};
  const _id = new ObjectId(req.user!.id);
  const a = await col.admins().findOne({_id});
  if (!a || !(await checkPassword(String(current ?? ''), a.password)))
    return res.status(400).json({error: 'Current password is incorrect.'});
  const bad = passwordProblem(next);
  if (bad) return res.status(400).json({error: bad});
  await col.admins().updateOne({_id}, {$set: {password: await hashPassword(next)}});
  await endAllSessions(req.user!.id);
  const expiresAt = await startSession(res, req.user!.id);
  res.json({ok: true, expiresAt});
});
