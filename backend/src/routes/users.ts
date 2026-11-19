/* Employees management: dashboard accounts and the roles they hold (an employee can have several).
   Open to anyone whose roles grant the "employees" page, with limits for non-Super-Admins so nobody can promote
   themselves: they can't touch Super Admin accounts or their own roles, and can only hand out roles whose pages
   they have themselves. */
import {Router, type Request} from 'express';
import {isUniqueViolation, isUuid, one, pool, query} from '../db/pg.js';
import {requirePage} from '../middleware/auth.js';
import {hashPassword, passwordProblem} from '../lib/passwords.js';
import {adminSelect, canAccess, loadUser, publicUser, toUser, type AdminWithRoles, type User} from '../lib/roles.js';
import {endAllSessions} from '../lib/sessions.js';
import {normalizeEmail} from '../services/authService.js';

export const usersRouter = Router();
usersRouter.use(requirePage('employees'));

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const get = async (id: unknown) => (isUuid(id) ? loadUser(id) : undefined);
const activeSuperAdmins = async () =>
  Number(
    (
      await one<{n: string}>(
        `select count(distinct a.id) n from admins a join admin_roles ar on ar.admin_id = a.id
           join roles r on r.id = ar.role_id where r.system and a.active`
      )
    )?.n ?? 0
  );

class Refused extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/* roleIds from the request: real roles this user is allowed to hand out */
async function assignableRoles(req: Request, raw: unknown) {
  if (!Array.isArray(raw) || !raw.every(isUuid)) throw new Refused(400, 'Choose the roles from the list.');
  const ids = [...new Set(raw)];
  const {rows} = await query<{id: string; name: string; system: boolean; pages: string[]}>(
    'select id, name, system, pages from roles where id = any($1)',
    [ids]
  );
  if (rows.length !== ids.length) throw new Refused(400, 'One of these roles no longer exists. Reload the page.');
  const me = req.user!;
  if (!me.superAdmin) {
    const tooMuch = rows.find(r => r.system || r.pages.some(p => !canAccess(me, p)));
    if (tooMuch) throw new Refused(403, `Only a Super Admin can give the role “${tooMuch.name}”.`);
  }
  return rows;
}

async function setRoles(adminId: string, roleIds: string[]) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('delete from admin_roles where admin_id = $1', [adminId]);
    if (roleIds.length)
      await client.query(
        'insert into admin_roles (admin_id, role_id) select $1, unnest($2::uuid[]) on conflict do nothing',
        [adminId, roleIds]
      );
    await client.query('commit');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/* a non-Super-Admin may not change a Super Admin's account in any way */
const guardTarget = (me: User, target: User) => {
  if (target.superAdmin && !me.superAdmin) throw new Refused(403, 'Only a Super Admin can change a Super Admin.');
};

const send = (res: import('express').Response, e: unknown) => {
  if (e instanceof Refused) return res.status(e.status).json({error: e.message});
  throw e;
};

usersRouter.get('/', async (_req, res) => {
  const {rows} = await query<AdminWithRoles>(`${adminSelect()} group by a.id order by a.created_at, a.id`);
  res.json({users: rows.map(a => publicUser(toUser(a)))});
});

usersRouter.post('/', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const name = String(req.body?.name ?? '').trim();
    const {password, roleIds} = req.body ?? {};
    if (!EMAIL.test(email)) throw new Refused(400, 'Enter a valid email address.');
    const bad = passwordProblem(password);
    if (bad) throw new Refused(400, bad);
    const roles = await assignableRoles(req, roleIds ?? []);
    let created;
    try {
      created = await one<{id: string}>('insert into admins (email, name, password) values ($1, $2, $3) returning id', [
        email,
        name,
        await hashPassword(password)
      ]);
    } catch (e) {
      if (isUniqueViolation(e)) throw new Refused(409, 'An employee with this email already exists.');
      throw e;
    }
    await setRoles(
      created!.id,
      roles.map(r => r.id)
    );
    res.status(201).json({user: publicUser((await loadUser(created!.id))!)});
  } catch (e) {
    send(res, e);
  }
});

usersRouter.patch('/:id', async (req, res) => {
  try {
    const u = await get(req.params.id);
    if (!u) throw new Refused(404, 'Employee not found.');
    const me = req.user!;
    const self = u.id === me.id;
    guardTarget(me, u);
    const {name, active, password, roleIds} = req.body ?? {};

    if (password !== undefined) {
      const bad = passwordProblem(password);
      if (bad) throw new Refused(400, bad);
    }
    const roles = roleIds === undefined ? undefined : await assignableRoles(req, roleIds);
    if (roles && self && !me.superAdmin) throw new Refused(403, 'You can’t change your own roles.');
    if (active === false && self) throw new Refused(400, 'You can’t disable your own account.');

    const losesSuper = u.superAdmin && u.active && (active === false || (roles && !roles.some(r => r.system)));
    if (losesSuper && self) throw new Refused(400, 'You can’t remove your own Super Admin role.');
    if (losesSuper && (await activeSuperAdmins()) <= 1)
      throw new Refused(400, 'There must be at least one active Super Admin.');

    /* only the fields that were sent change: null keeps the current value */
    await query(
      `update admins set name = coalesce($2, name), active = coalesce($3, active), password = coalesce($4, password)
        where id = $1`,
      [
        u.id,
        name === undefined ? null : String(name).trim(),
        active === undefined ? null : !!active,
        password === undefined ? null : await hashPassword(password)
      ]
    );
    if (roles)
      await setRoles(
        u.id,
        roles.map(r => r.id)
      );
    if (active === false || (password !== undefined && !self)) await endAllSessions(u.id);
    res.json({user: publicUser((await loadUser(u.id))!)});
  } catch (e) {
    send(res, e);
  }
});

usersRouter.delete('/:id', async (req, res) => {
  try {
    const u = await get(req.params.id);
    if (!u) throw new Refused(404, 'Employee not found.');
    if (u.id === req.user!.id) throw new Refused(400, 'You can’t delete your own account.');
    guardTarget(req.user!, u);
    if (u.superAdmin && u.active && (await activeSuperAdmins()) <= 1)
      throw new Refused(400, 'There must be at least one active Super Admin.');
    /* their roles and sessions go with them (on delete cascade) */
    await query('delete from admins where id = $1', [u.id]);
    res.json({ok: true});
  } catch (e) {
    send(res, e);
  }
});
