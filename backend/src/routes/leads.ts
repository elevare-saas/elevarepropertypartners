/* Website leads → the "leads" table (form fields in a jsonb column).
   POST /api/leads            public: the concierge posts each enquiry / viewing request (CONFIG.leadEndpoint in the frontend)
   GET  /api/admin/leads      staff with leads.view: newest first, ?status=new|contacted|closed &limit= &before=<ISO date>
   PATCH /api/admin/leads/:id staff with leads.edit: {status} */
import {Router} from 'express';
import {env} from '../config/env.js';
import {isUuid, one, query} from '../db/pg.js';
import {requirePermission} from '../middleware/auth.js';
import {log} from '../lib/logger.js';
import {sendMail} from '../lib/mailer.js';
import {leadLimiter} from '../lib/rateLimit.js';
import {sendLeadWebhook} from '../lib/webhook.js';

const STATUSES = ['new', 'contacted', 'closed'] as const;
/* the fields the website's lead payload carries (src/concierge/engine.ts → lead()) */
const FIELDS = [
  'channel',
  'ref',
  'mode',
  'persona',
  'style',
  'summary',
  'note',
  'listing',
  'listing_id',
  'listings',
  'compared',
  'price_thb',
  'market_thb',
  'area',
  'type',
  'beds',
  'ownership',
  'move_in',
  'lease_months',
  'timeline',
  'budget_thb',
  'must',
  'viewing',
  'day',
  'time',
  'name',
  'contact',
  'message',
  'ts'
];

/* keep only plain JSON values of bounded size: no operators, no deep nesting, no huge strings */
function clean(v: unknown, depth = 0): unknown {
  if (v === null || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') return v.slice(0, 5000);
  if (depth >= 3) return undefined;
  if (Array.isArray(v))
    return v
      .slice(0, 30)
      .map(x => clean(x, depth + 1))
      .filter(x => x !== undefined);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v).slice(0, 30)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      const c = clean(x, depth + 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  return undefined;
}

/* a stored lead as the dashboard and API have always shown it: the form fields plus status and dates */
interface LeadRow {
  id: string;
  status: string;
  data: Record<string, unknown>;
  receivedAt: Date;
  updatedAt: Date | null;
  updatedBy: string | null;
}
const LEAD_COLS = `id, status, data, received_at as "receivedAt", updated_at as "updatedAt", updated_by as "updatedBy"`;
const toLead = (l: LeadRow) => ({
  _id: l.id,
  ...l.data,
  status: l.status,
  receivedAt: l.receivedAt,
  ...(l.updatedAt && {updatedAt: l.updatedAt, updatedBy: l.updatedBy})
});

export const publicLeads = Router();
publicLeads.post('/', async (req, res) => {
  const ip = req.ip ?? 'unknown';
  if (leadLimiter.blocked(ip)) return res.status(429).json({error: 'Too many requests. Please try again later.'});
  const b = req.body;
  if (!b || typeof b !== 'object' || b.event !== 'elevare_lead') return res.status(400).json({error: 'Not a lead.'});
  leadLimiter.hit(ip);

  const doc: Record<string, unknown> = {};
  for (const f of FIELDS)
    if (b[f] !== undefined) {
      const c = clean(b[f]);
      if (c !== undefined) doc[f] = c;
    }
  const row = await one<{id: string}>('insert into leads (ref, data, user_agent) values ($1, $2, $3) returning id', [
    typeof doc.ref === 'string' ? doc.ref : null,
    doc,
    String(req.get('user-agent') ?? '').slice(0, 300)
  ]);
  const insertedId = row!.id;
  log.info(`Lead ${doc.ref ?? insertedId} stored (${doc.channel ?? '?'}, ${doc.listing ?? 'no listing'})`);

  if (env.mail.leadsNotify.length) {
    const s = (k: string) => (doc[k] == null || doc[k] === '' ? '—' : String(doc[k]));
    void sendMail({
      to: env.mail.leadsNotify,
      subject: `New ${doc.mode === 'buy' ? 'purchase' : 'rental'} lead ${s('ref')}: ${s('listing')}`,
      text: [
        `Name: ${s('name')}`,
        `Contact: ${s('contact')}`,
        `Via: ${s('channel')}`,
        `Home: ${s('listing')} (${s('listing_id')})`,
        `Area: ${s('area')}`,
        `Budget (THB): ${s('budget_thb')}`,
        `Viewing: ${s('viewing')} ${s('day')} ${s('time')}`,
        '',
        s('message'),
        '',
        `Open the dashboard: ${env.frontendUrl}/admin-dashboard`
      ].join('\n')
    });
  }
  /* the webhook gets the lead itself, not the visitor's browser string */
  void sendLeadWebhook({id: insertedId, status: 'new', ...doc});
  res.status(202).json({ok: true, id: insertedId});
});

export const adminLeads = Router();
adminLeads.get('/', requirePermission('leads.view'), async (req, res) => {
  const where: string[] = [];
  const params: unknown[] = [];
  if (STATUSES.includes(req.query.status as (typeof STATUSES)[number])) {
    params.push(req.query.status);
    where.push(`status = $${params.length}`);
  }
  const before = new Date(String(req.query.before ?? ''));
  if (!Number.isNaN(before.getTime())) {
    params.push(before);
    where.push(`received_at < $${params.length}`);
  }
  params.push(Math.min(Math.max(Number(req.query.limit) || 50, 1), 200));
  const {rows} = await query<LeadRow>(
    `select ${LEAD_COLS} from leads ${where.length ? 'where ' + where.join(' and ') : ''}
      order by received_at desc limit $${params.length}`,
    params
  );
  res.json({leads: rows.map(toLead)});
});

adminLeads.patch('/:id', requirePermission('leads.edit'), async (req, res) => {
  const status = req.body?.status;
  if (!STATUSES.includes(status)) return res.status(400).json({error: `Status must be one of ${STATUSES.join(', ')}.`});
  if (!isUuid(req.params.id)) return res.status(404).json({error: 'Lead not found.'});
  const lead = await one<LeadRow>(
    `update leads set status = $2, updated_at = now(), updated_by = $3 where id = $1 returning ${LEAD_COLS}`,
    [req.params.id, status, req.user!.email]
  );
  if (!lead) return res.status(404).json({error: 'Lead not found.'});
  res.json({lead: toLead(lead)});
});
