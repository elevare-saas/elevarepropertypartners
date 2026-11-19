/* Roles & access: the CEO (Super Admin) decides which dashboard pages each role can open.
   GET    /api/admin/roles        "employees" page: roles (with member counts) + the pages that can be granted
   POST   /api/admin/roles        Super Admin: {name, description?, pages[]}
   PATCH  /api/admin/roles/:id    Super Admin: any of {name, description, pages}
   DELETE /api/admin/roles/:id    Super Admin: employees who had it simply lose its pages
   The built-in Super Admin role (system) has every page and can't be changed or deleted. */
import {Router} from 'express';
import {isUniqueViolation, isUuid, one, query} from '../db/pg.js';
import {requirePage, requireSuperAdmin} from '../middleware/auth.js';
import {isPageKey, PAGES} from '../lib/roles.js';

export const rolesRouter = Router();

interface RoleRow {
  id: string;
  name: string;
  description: string;
  pages: string[];
  system: boolean;
  members: number;
}
const ROLE_COLS = `r.id, r.name, r.description, r.pages, r.system,
  (select count(*)::int from admin_roles ar where ar.role_id = r.id) as members`;
const getRole = (id: string) => one<RoleRow>(`select ${ROLE_COLS} from roles r where r.id = $1`, [id]);

/* name and pages from the request; undefined = not sent */
function readInput(b: Record<string, unknown>, partial: boolean) {
  const errors: string[] = [];
  const name = b.name === undefined ? undefined : String(b.name).trim().slice(0, 60);
  const description = b.description === undefined ? undefined : String(b.description).trim().slice(0, 200);
  let pages: string[] | undefined;
  if ((!partial || name !== undefined) && !name) errors.push('Give the role a name.');
  if (b.pages !== undefined || !partial) {
    if (!Array.isArray(b.pages) || !b.pages.every(isPageKey)) errors.push('Choose pages from the list.');
    else pages = [...new Set(b.pages as string[])];
  }
  return {errors, name, description, pages};
}

rolesRouter.get('/', requirePage('employees'), async (_req, res) => {
  const {rows} = await query<RoleRow>(`select ${ROLE_COLS} from roles r order by r.system desc, r.name`);
  res.json({roles: rows, pages: PAGES});
});

rolesRouter.post('/', requireSuperAdmin, async (req, res) => {
  const {errors, name, description, pages} = readInput(req.body ?? {}, false);
  if (errors.length) return res.status(400).json({error: errors.join(' ')});
  try {
    const row = await one<{id: string}>(
      'insert into roles (name, description, pages) values ($1, $2, $3) returning id',
      [name, description ?? '', pages]
    );
    res.status(201).json({role: await getRole(row!.id)});
  } catch (e) {
    if (isUniqueViolation(e)) return res.status(409).json({error: 'A role with this name already exists.'});
    throw e;
  }
});

rolesRouter.patch('/:id', requireSuperAdmin, async (req, res) => {
  const role = isUuid(req.params.id) ? await getRole(req.params.id) : undefined;
  if (!role) return res.status(404).json({error: 'Role not found.'});
  if (role.system) return res.status(400).json({error: 'The Super Admin role always has every page.'});
  const {errors, name, description, pages} = readInput(req.body ?? {}, true);
  if (errors.length) return res.status(400).json({error: errors.join(' ')});
  try {
    await query(
      `update roles set name = coalesce($2, name), description = coalesce($3, description), pages = coalesce($4, pages)
        where id = $1`,
      [role.id, name ?? null, description ?? null, pages ?? null]
    );
  } catch (e) {
    if (isUniqueViolation(e)) return res.status(409).json({error: 'A role with this name already exists.'});
    throw e;
  }
  res.json({role: await getRole(role.id)});
});

rolesRouter.delete('/:id', requireSuperAdmin, async (req, res) => {
  const role = isUuid(req.params.id) ? await getRole(req.params.id) : undefined;
  if (!role) return res.status(404).json({error: 'Role not found.'});
  if (role.system) return res.status(400).json({error: 'The Super Admin role can’t be deleted.'});
  await query('delete from roles where id = $1', [role.id]);
  res.json({ok: true, members: role.members});
});
