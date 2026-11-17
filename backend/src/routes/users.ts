/* Super Admin only: manage the "admins" table */
import {Router} from 'express';
import {ADMIN_COLS, isUniqueViolation, isUuid, one, query, type AdminRow} from '../db/pg.js';
import {requirePermission} from '../middleware/auth.js';
import {hashPassword, passwordProblem} from '../lib/passwords.js';
import {isRole, publicUser, toUser} from '../lib/roles.js';
import {endAllSessions} from '../lib/sessions.js';
import {normalizeEmail} from '../services/authService.js';

export const usersRouter = Router();
usersRouter.use(requirePermission('users.manage'));

type Row = Omit<AdminRow, 'password'>;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const get = async (id: unknown) => {
  const a = isUuid(id) ? await one<Row>(`select ${ADMIN_COLS} from admins where id = $1`, [id]) : undefined;
  return a ? toUser(a) : undefined;
};
const activeSuperAdmins = async () =>
  Number((await one<{n: string}>(`select count(*) n from admins where role = 'super_admin' and active`))?.n ?? 0);

usersRouter.get('/', async (_req, res) => {
  const {rows} = await query<Row>(`select ${ADMIN_COLS} from admins order by created_at, id`);
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
    const a = await one<Row>(
      `insert into admins (email, name, role, password) values ($1, $2, $3, $4) returning ${ADMIN_COLS}`,
      [email, name, role, await hashPassword(password)]
    );
    res.status(201).json({user: publicUser(toUser(a!))});
  } catch (e) {
    if (isUniqueViolation(e)) return res.status(409).json({error: 'A user with this email already exists.'});
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

  /* only the fields that were sent change: null keeps the current value */
  const updated = await one<Row>(
    `update admins set
        name = coalesce($2, name),
        role = coalesce($3, role),
        active = coalesce($4, active),
        password = coalesce($5, password)
      where id = $1
      returning ${ADMIN_COLS}`,
    [
      u.id,
      name === undefined ? null : String(name).trim(),
      role ?? null,
      active === undefined ? null : !!active,
      password === undefined ? null : await hashPassword(password)
    ]
  );
  if (active === false || (password !== undefined && !self)) await endAllSessions(u.id);
  res.json({user: publicUser(toUser(updated!))});
});

usersRouter.delete('/:id', async (req, res) => {
  const u = await get(req.params.id);
  if (!u) return res.status(404).json({error: 'User not found.'});
  if (u.id === req.user!.id) return res.status(400).json({error: 'You cannot delete your own account.'});
  if (u.role === 'super_admin' && u.active && (await activeSuperAdmins()) <= 1)
    return res.status(400).json({error: 'There must be at least one active Super Admin.'});
  /* their sessions go with them (on delete cascade) */
  await query('delete from admins where id = $1', [u.id]);
  res.json({ok: true});
});
