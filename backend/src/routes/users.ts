/* Super Admin only: manage the "admins" collection */
import {Router} from 'express';
import {col, isDuplicateKey, toObjectId, type AdminFields} from '../db/mongo.js';
import {requirePermission} from '../middleware/auth.js';
import {hashPassword, passwordProblem} from '../lib/passwords.js';
import {isRole, publicUser, toUser} from '../lib/roles.js';
import {endAllSessions} from '../lib/sessions.js';
import {normalizeEmail} from '../services/authService.js';

export const usersRouter = Router();
usersRouter.use(requirePermission('users.manage'));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NO_PASSWORD = {projection: {password: 0}} as const;
const get = async (id: unknown) => {
  const _id = toObjectId(id);
  const a = _id && (await col.admins().findOne({_id}, NO_PASSWORD));
  return a ? toUser(a) : undefined;
};
const activeSuperAdmins = () => col.admins().countDocuments({role: 'super_admin', active: {$ne: false}});

usersRouter.get('/', async (_req, res) => {
  const rows = await col.admins().find({}, NO_PASSWORD).sort({createdAt: 1, _id: 1}).toArray();
  res.json({users: rows.map(a => publicUser(toUser(a)))});
});

usersRouter.post('/', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const name = String(req.body?.name ?? '').trim();
  const {role, password} = req.body ?? {};
  if (!EMAIL.test(email)) return res.status(400).json({error: 'Enter a valid email address.'});
  if (!isRole(role)) return res.status(400).json({error: 'Choose a role.'});
  const bad = passwordProblem(password);
  if (bad) return res.status(400).json({error: bad});
  try {
    const doc = {
      email,
      name,
      role,
      password: await hashPassword(password),
      active: true,
      createdAt: new Date(),
      lastLoginAt: null
    };
    const {insertedId} = await col.admins().insertOne(doc);
    const {password: _p, ...rest} = doc;
    res.status(201).json({user: publicUser(toUser({_id: insertedId, ...rest}))});
  } catch (e) {
    if (isDuplicateKey(e)) return res.status(409).json({error: 'A user with this email already exists.'});
    throw e;
  }
});

usersRouter.patch('/:id', async (req, res) => {
  const u = await get(req.params.id);
  if (!u) return res.status(404).json({error: 'User not found.'});
  const self = u.id === req.user!.id;
  const {name, role, active, password} = req.body ?? {};

  if (role !== undefined && !isRole(role)) return res.status(400).json({error: 'Unknown role.'});
  if (password !== undefined) {
    const bad = passwordProblem(password);
    if (bad) return res.status(400).json({error: bad});
  }
  const losesSuper =
    u.role === 'super_admin' && u.active && ((role !== undefined && role !== 'super_admin') || active === false);
  if (losesSuper && self) return res.status(400).json({error: 'You cannot remove your own Super Admin access.'});
  if (losesSuper && (await activeSuperAdmins()) <= 1)
    return res.status(400).json({error: 'There must be at least one active Super Admin.'});

  const set: Partial<AdminFields> = {};
  if (name !== undefined) set.name = String(name).trim();
  if (role !== undefined) set.role = role;
  if (active !== undefined) set.active = !!active;
  if (password !== undefined) set.password = await hashPassword(password);
  const updated = await col
    .admins()
    .findOneAndUpdate({_id: toObjectId(u.id)!}, {$set: set}, {returnDocument: 'after', ...NO_PASSWORD});
  if (active === false || (password !== undefined && !self)) await endAllSessions(u.id);
  res.json({user: publicUser(toUser(updated!))});
});

usersRouter.delete('/:id', async (req, res) => {
  const u = await get(req.params.id);
  if (!u) return res.status(404).json({error: 'User not found.'});
  if (u.id === req.user!.id) return res.status(400).json({error: 'You cannot delete your own account.'});
  if (u.role === 'super_admin' && u.active && (await activeSuperAdmins()) <= 1)
    return res.status(400).json({error: 'There must be at least one active Super Admin.'});
  await col.admins().deleteOne({_id: toObjectId(u.id)!});
  await endAllSessions(u.id);
  res.json({ok: true});
});
