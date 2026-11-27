/* Postgres (Supabase): connection pool, row types, schema migration.
   Connect through Supabase's transaction pooler (port 6543): it works over IPv4, which Vercel and most hosts need. */
import pg from 'pg';
import {env} from '../config/env.js';
import {log} from '../lib/logger.js';

export interface AdminRow {
  id: string;
  email: string; // stored lower-case, unique
  password: string; // bcrypt hash, never the password itself
  name: string;
  active: boolean;
  createdAt: Date | null;
  lastLoginAt: Date | null;
}
export interface ListingRow {
  id: string; // the listing id the website uses, e.g. "R1" or "3FA9C2D1"
  seq: number; // display order on the website
  mode: 'rent' | 'buy';
  name: string;
  area: string;
  type: string;
  beds: number;
  sqm: number | null; // floor (total built-up) area; optional
  livingSqm: number | null; // indoor living area (developers often state it separately); optional
  landSqm: number | null; // plot size; optional
  baths: number | null; // bathrooms; optional
  refCode: string | null; // private reference code, e.g. "ELV-001": admin only, never sent to the website
  price: number;
  own: string | null;
  rent: number | null;
  am: string[];
  ex: string[];
  hue: number;
  line: string; // short description for cards (up to 240 characters)
  description: string; // full description for the property page ('' when none)
  photo: string | null; // the cover: always photos[0] (kept for older readers)
  photos: string[]; // gallery in display order, cover first
  draft: boolean; // waiting for review (e.g. written by AI); never public
  ai: ListingAi | null; // what the AI was given and what it wants checked
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

/* stored with an AI-written draft: the staff notes it started from, and the fields a person must check */
export interface ListingAi {
  notes: string;
  check: string[];
  model?: string;
  generatedAt?: string;
}

/* bigint columns (prices) come back as numbers: every price fits easily in a JS number */
pg.types.setTypeParser(pg.types.builtins.INT8, v => Number(v));

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(env.db.url);
export const pool = new pg.Pool({
  connectionString: env.db.url,
  max: env.db.poolMax,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 20_000,
  /* Supabase requires TLS; its certificate chain isn't in Node's default store */
  ssl: local ? undefined : {rejectUnauthorized: false},
  application_name: 'elevare-api'
});
pool.on('error', e => log.warn(`Postgres connection dropped: ${e.message}`));

export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]) {
  return pool.query<R>(text, values);
}
export async function one<R extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]) {
  return (await pool.query<R>(text, values)).rows[0] as R | undefined;
}

export const isUniqueViolation = (e: unknown) => (e as {code?: string})?.code === '23505';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: unknown): id is string => typeof id === 'string' && UUID.test(id);

/* column lists with camelCase names, for SELECT … and RETURNING … */
export const LISTING_COLS = `id, seq, mode, name, area, type, beds, baths, sqm, living_sqm as "livingSqm", land_sqm as "landSqm", ref_code as "refCode",
  price, own, rent, am, ex, hue, line, description, photo, photos, draft, ai, published, created_at as "createdAt", updated_at as "updatedAt",
  updated_by as "updatedBy"`;
/* the unique index on reference codes, to tell "code taken" from an id collision */
export const REF_CODE_INDEX = 'listings_ref_code';

/* a plain explanation for the connection errors that waiting can't fix (wrong password, user, host…) */
export function explainDbError(e: unknown): string | undefined {
  const {code, message = ''} = e as {code?: string; message?: string};
  const fix = 'Update DATABASE_URL in backend/.env (and in Vercel: npm run vercel:db).';
  if (code === '28P01' || /password authentication failed/i.test(message))
    return `The database rejected the password. ${fix}`;
  if (code === '28000' || /tenant\/user .* not found|role .* does not exist/i.test(message))
    return `The database user or project in DATABASE_URL is wrong (it should be postgres.<project-ref>). ${fix}`;
  if (code === '3D000') return `The database name in DATABASE_URL doesn't exist (Supabase uses "postgres"). ${fix}`;
  if (code === 'ENOTFOUND') return `The database host in DATABASE_URL can't be found. ${fix}`;
  return undefined;
}

/* retries so the API can start alongside the database; a serverless function only has seconds */
const RETRIES = process.env.VERCEL ? 2 : 5;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
/* autoMigrate: a long-running server brings the tables up to date at start; serverless runs `npm run db:migrate` */
export async function connectDb({autoMigrate = false} = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query('select 1');
      break;
    } catch (e) {
      const plain = explainDbError(e);
      if (plain) throw new Error(plain, {cause: e});
      if (attempt === RETRIES)
        throw new Error(`Database unreachable: ${(e as Error).message || (e as {code?: string}).code}`, {cause: e});
      log.warn(`Database not reachable (attempt ${attempt}/${RETRIES}), retrying in ${attempt * 2}s…`);
      await wait(attempt * 2_000);
    }
  }
  if (autoMigrate) await migrate();
  const ready = await one<{ok: boolean}>(`select to_regclass('public.listings') is not null as ok`);
  if (!ready?.ok) throw new Error('The database has no tables yet. Run: npm run db:migrate');
  log.info('Database connected.');
}

export async function pingDb(): Promise<'up' | 'down'> {
  try {
    await pool.query('select 1');
    return 'up';
  } catch {
    return 'down';
  }
}
export const closeDb = () => pool.end();

/* idempotent: safe to run on every deploy. RLS is on with no policies, so Supabase's public API (anon / authenticated
   keys) can't read or change anything; this backend connects as the table owner, which RLS doesn't restrict. */
export const SCHEMA = `
create extension if not exists pgcrypto;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password text not null,
  name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- roles: what the CEO grants. pages lists dashboard page keys (backend/src/lib/roles.ts -> PAGES).
-- The one "system" role is Super Admin: every page, can't be edited or deleted.
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  pages text[] not null default '{}',
  system boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists roles_single_system on roles (system) where system;
create unique index if not exists roles_name_ci on roles (lower(name));
insert into roles (name, description, system)
  values ('Super Admin', 'Every page, including employees and roles', true)
  on conflict do nothing;

-- an employee can have several roles
create table if not exists admin_roles (
  admin_id uuid not null references admins (id) on delete cascade,
  role_id uuid not null references roles (id) on delete cascade,
  primary key (admin_id, role_id)
);
create index if not exists admin_roles_role on admin_roles (role_id);

-- once: the old fixed admins.role column becomes roles + admin_roles
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = current_schema() and table_name = 'admins' and column_name = 'role') then
    insert into roles (name, description, pages)
      values ('Marketing Manager', 'Properties', '{properties}') on conflict do nothing;
    if exists (select 1 from admins where role = 'viewer') then
      insert into roles (name, description, pages) values ('Viewer', 'Properties', '{properties}') on conflict do nothing;
    end if;
    insert into admin_roles (admin_id, role_id)
      select a.id, r.id from admins a
        join roles r on (a.role = 'super_admin' and r.system)
                     or (a.role = 'marketing_manager' and r.name = 'Marketing Manager')
                     or (a.role = 'viewer' and r.name = 'Viewer')
      on conflict do nothing;
    alter table admins drop column role;
  end if;
end $$;

create table if not exists sessions (
  token_hash text primary key,
  admin_id uuid not null references admins (id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists sessions_admin_id on sessions (admin_id);
create index if not exists sessions_expires_at on sessions (expires_at);

create sequence if not exists listings_seq;
create table if not exists listings (
  id text primary key,
  seq integer not null default nextval('listings_seq'),
  mode text not null check (mode in ('rent', 'buy')),
  name text not null,
  area text not null,
  type text not null,
  beds integer not null,
  sqm integer not null,
  price bigint not null,
  own text,
  rent bigint,
  am text[] not null default '{}',
  ex text[] not null default '{}',
  hue integer not null default 260,
  line text not null default '',
  photo text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);
create index if not exists listings_public on listings (published, mode, seq);
create index if not exists listings_updated on listings (updated_at desc);
-- optional floor area, optional plot size, and a private reference code (unique, any case)
alter table listings alter column sqm drop not null;
alter table listings add column if not exists land_sqm integer;
alter table listings add column if not exists baths integer;
alter table listings add column if not exists ref_code text;
create unique index if not exists listings_ref_code on listings (upper(ref_code)) where ref_code is not null;
-- photo gallery (cover first; "photo" mirrors photos[1]), drafts waiting for review, and AI notes
alter table listings add column if not exists photos text[] not null default '{}';
update listings set photos = array[photo] where photo is not null and photos = '{}';
alter table listings add column if not exists draft boolean not null default false;
alter table listings add column if not exists ai jsonb;
-- full description for the property page (the short "line" stays for cards)
alter table listings add column if not exists description text not null default '';
-- optional indoor living area, next to the floor (total built-up) area
alter table listings add column if not exists living_sqm integer;
-- website settings edited in the dashboard: areas, market estimates, contact details (lib/settings.ts)
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'listings_draft_hidden') then
    update listings set published = false where draft;
    alter table listings add constraint listings_draft_hidden check (not (draft and published));
  end if;
end $$;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  ref text,
  data jsonb not null default '{}',
  user_agent text,
  received_at timestamptz not null default now(),
  updated_at timestamptz,
  updated_by text
);
create index if not exists leads_received on leads (received_at desc);
create index if not exists leads_status on leads (status, received_at desc);
create index if not exists leads_ref on leads (ref);

create table if not exists app_meta (
  key text primary key,
  value text not null
);

alter table admins enable row level security;
alter table roles enable row level security;
alter table admin_roles enable row level security;
alter table sessions enable row level security;
alter table listings enable row level security;
alter table leads enable row level security;
alter table app_meta enable row level security;
alter table site_settings enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on admins, roles, admin_roles, sessions, listings, leads, app_meta, site_settings from anon, authenticated;
    revoke all on sequence listings_seq from anon, authenticated;
  end if;
end $$;
`;

export async function migrate() {
  await pool.query(SCHEMA);
  /* first run: today's areas, market estimates and contact details go into site_settings */
  const {seedSettings} = await import('../lib/settings.js');
  await seedSettings();
}
