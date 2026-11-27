/* Website settings (lib/settings.ts).
   GET  /api/settings                 public: what the website needs (areas, market estimates, contact details)
   GET  /api/admin/settings           Website settings page: the same, plus how many properties each area has
   PUT  /api/admin/settings/:key      areas | market | contact: replace that group (checked first) */
import {Router} from 'express';
import {pool, query} from '../db/pg.js';
import {requirePage} from '../middleware/auth.js';
import {
  checkAreas,
  checkContact,
  checkMarket,
  getSettings,
  SETTINGS_KEYS,
  type Area,
  type Settings,
  type SettingsKey
} from '../lib/settings.js';

const publicView = (s: Settings) => ({
  areas: s.areas.map(({k, d, f, province, aliases}) => ({k, d, f, province, aliases})),
  market: s.market,
  contact: s.contact
});

export const publicSettings = Router();
publicSettings.get('/', async (_req, res) => {
  res.set('Cache-Control', 'no-cache').json(publicView(await getSettings()));
});

/* properties per area name (every property, live or not) */
const areaUse = async () =>
  Object.fromEntries(
    (await query<{area: string; n: number}>('select area, count(*)::int as n from listings group by area')).rows.map(
      r => [r.area, r.n]
    )
  ) as Record<string, number>;

export const adminSettings = Router();
adminSettings.use(requirePage('settings'));

adminSettings.get('/', async (_req, res) => {
  const [settings, use, meta] = await Promise.all([
    getSettings(),
    areaUse(),
    query<{key: string; updatedAt: Date; updatedBy: string | null}>(
      `select key, updated_at as "updatedAt", updated_by as "updatedBy" from site_settings`
    )
  ]);
  res.json({...settings, areaUse: use, updated: Object.fromEntries(meta.rows.map(r => [r.key, r]))});
});

const CHECK = {areas: checkAreas, market: checkMarket, contact: checkContact} as const;

adminSettings.put('/:key', async (req, res) => {
  const key = req.params.key as SettingsKey;
  if (!SETTINGS_KEYS.includes(key)) return res.status(404).json({error: 'Unknown settings group.'});
  const {value, errors} = CHECK[key](req.body?.value);
  if (errors.length) return res.status(400).json({error: errors.join(' '), errors});
  const by = req.user!.email;

  if (key !== 'areas') {
    await query(
      `insert into site_settings (key, value, updated_at, updated_by) values ($1, $2, now(), $3)
       on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
      [key, JSON.stringify(value), by]
    );
    return res.json({value});
  }

  /* areas: a renamed area takes its properties with it; one still used by properties can't be removed */
  const areas = value as Area[];
  const db = await pool.connect();
  try {
    await db.query('begin');
    const before =
      ((await db.query<{value: Area[]}>(`select value from site_settings where key = 'areas' for update`)).rows[0]
        ?.value as Area[] | undefined) ?? (await getSettings()).areas;
    const renamed = before.flatMap(old => {
      const now = areas.find(a => a.id === old.id);
      return now && now.k !== old.k ? [{from: old.k, to: now.k}] : [];
    });
    const removed = before.filter(old => !areas.some(a => a.id === old.id) && !areas.some(a => a.k === old.k));
    if (removed.length) {
      const {rows} = await db.query<{area: string; n: number}>(
        'select area, count(*)::int as n from listings where area = any($1) group by area',
        [removed.map(a => a.k)]
      );
      if (rows.length) {
        await db.query('rollback');
        const list = rows.map(r => `${r.area} (${r.n} propert${r.n === 1 ? 'y' : 'ies'})`).join(', ');
        return res
          .status(409)
          .json({error: `Still in use: ${list}. Move those properties to another area first, or keep the area.`});
      }
    }
    /* two-step rename so swapping two names (A→B, B→A) can't mix properties up */
    const temp = (i: number) => `__renaming_${i}__`;
    for (const [i, r] of renamed.entries())
      await db.query('update listings set area = $2 where area = $1', [r.from, temp(i)]);
    for (const [i, r] of renamed.entries())
      await db.query(`update listings set area = $2, updated_at = now(), updated_by = $3 where area = $1`, [
        temp(i),
        r.to,
        by
      ]);
    await db.query(
      `insert into site_settings (key, value, updated_at, updated_by) values ('areas', $1, now(), $2)
       on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
      [JSON.stringify(areas), by]
    );
    await db.query('commit');
    res.json({value: areas, renamed, areaUse: await areaUse()});
  } catch (e) {
    await db.query('rollback').catch(() => {});
    throw e;
  } finally {
    db.release();
  }
});
