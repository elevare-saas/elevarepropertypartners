# Elevare backend

Node + TypeScript + Express API. It serves the property listings for the website, stores the website's leads, and handles
sign-in and roles for the admin dashboard (`/admin-login`, `/admin-dashboard` in `../elevare-frontend`).

| Service | Holds | |
|---|---|---|
| **Postgres** (Supabase) | everything: see tables below | required |
| **SMTP** | email to the team for each new lead | optional |

| Table | Rows |
|---|---|
| `admins` | dashboard accounts: `id` (uuid), `email` (lower-case, unique), `role`, `password` (bcrypt hash), `name`, `active`, `created_at`, `last_login_at` |
| `sessions` | one per sign-in: `token_hash` (SHA-256 of the cookie token), `admin_id`, `expires_at` (expired ones are cleared on sign-in) |
| `listings` | the properties: `id` (listing id), `seq` (display order), the website's listing fields, `published`, `updated_by`… |
| `leads` | website enquiries and viewing requests: `status` new / contacted / closed, the form fields in `data` (jsonb) |
| `app_meta` | small flags, e.g. that the sample listings were loaded once |

Row Level Security is on for every table with no policies, so Supabase's public API keys can't read or change anything;
the backend connects as the table owner. The schema is in `src/db/pg.ts` (`SCHEMA`).

Needs **Node 22+**.

## Structure

```
src/
  server.ts            entry point: connect to the database (migrate) → seed → listen; graceful shutdown
  app.ts               the Express app: middleware + routes (no side effects)
  config/env.ts        all settings, read from environment variables (.env) and validated at start-up
  db/
    pg.ts              Postgres pool (node-postgres), row types, schema + migration
    seed.ts            first start: sample listings + first Super Admin
    seed-listings.json the 19 sample listings the website shipped with
  middleware/
    auth.ts            loadUser (session cookie → req.user), requireLogin, requirePermission
    security.ts        CORS policy + refuses cross-site write requests (CSRF)
    errors.ts          request log, 404, error handler
  lib/
    roles.ts           roles, permissions, public user shape
    sessions.ts        signed cookie sessions (random token, stored hashed in the database)
    passwords.ts       bcrypt hashing + password rules
    rateLimit.ts       login and lead-submission limits
    logger.ts          levelled logger (LOG_LEVEL)
    mailer.ts          SMTP email (nodemailer)
  routes/
    health.ts          GET  /api/health
    auth.ts            /api/auth/login, logout, me, password
    listings.ts        /api/listings (public), /api/admin/listings (+ photo upload)
    leads.ts           /api/leads (public), /api/admin/leads
    users.ts           /api/admin/users (Super Admin)
  services/
    authService.ts     sign-in check: find the admin by email, compare the bcrypt hash, active + known role
  scripts/
    create-admin.ts    npm run create-admin
dist/                  compiled JavaScript (npm run build)
```

## Setup

```sh
npm install
cp .env.example .env        # at least DATABASE_URL; also SESSION_SECRET, ADMIN_EMAIL / ADMIN_PASSWORD
```

| Command | |
|---|---|
| `npm run dev` | run from TypeScript source with auto-restart (tsx) |
| `npm run build` | compile `src/` → `dist/` with `tsc` |
| `npm start` | run the compiled server: `node dist/server.js` |
| `npm run typecheck` | type-check without emitting |
| `npm run lint` | ESLint + type-check |
| `npm run format` | format everything with Prettier (`format:check` to only check) |
| `npm run create-admin -- you@example.com "a-long-password"` | create or reset a Super Admin (after `build`) |
| `npm run db:migrate` | create or update the database tables (after `build`; safe to repeat) |

**Configuration:** every setting is documented in [.env.example](.env.example), grouped as server, database,
website/CORS, sessions & cookies, email, limits, and first Super Admin. Values are validated at start-up: if any is
wrong, the server lists every problem and exits.

On start the server connects to the database and brings the tables up to date (on Vercel, run `npm run db:migrate`
instead), and on an empty database loads the 19 sample listings and creates the first Super Admin. If `ADMIN_PASSWORD` is empty, a random password is printed **once**.

For local development, run `npm run dev` here and `npm run dev` in `../elevare-frontend`. Vite proxies `/api` and `/uploads`
to port 4000. Then open http://localhost:3000/admin-dashboard.

**Adding admins by hand** (Supabase table editor or SQL): store `email` (lower-case), `password` and `role`. A
plain-text password works once and is replaced by a bcrypt hash at that first sign-in; prefer `npm run create-admin` or
Employees management so no plain password is ever stored. An account with `active = false` or a role other than `super_admin` /
`marketing_manager` / `viewer` cannot sign in.

## Roles

| Role | Properties | Employees |
|---|---|---|
| Super Admin | view, add, edit, publish/hide, delete, upload photos; view and update leads | invite people, change roles, disable, reset passwords |
| Marketing Manager | view, add, edit, publish/hide, delete, upload photos; view and update leads | – |
| Viewer | view only (no leads: they hold visitors' personal details) | – |

The role is stored on the user and checked by the server on every request (`PERMISSIONS` in `src/lib/roles.ts`).
You can't remove your own Super Admin access, and there is always at least one active Super Admin.

## API

| Method & path | Who | |
|---|---|---|
| `GET /api/health` | public | API and database status |
| `POST /api/auth/login` `{email,password}` | anyone | sets an httpOnly session cookie (7 days) |
| `POST /api/auth/logout` · `GET /api/auth/me` · `POST /api/auth/password` | signed in | |
| `GET /api/listings` · `GET /api/listings/:id` | public | published listings, in the shape the website uses |
| `GET /api/admin/listings` | all roles | every listing, including hidden ones |
| `POST /api/admin/listings` · `PUT/DELETE /api/admin/listings/:id` · `PATCH …/:id/published` | Marketing, Super Admin | |
| `POST /api/admin/listings/delete` `{ids}` or `{all: true}` | Marketing, Super Admin | bulk delete → `{deleted}` |
| `POST /api/admin/listings/photo` (multipart `photo`) | Marketing, Super Admin | JPG/PNG/WebP ≤ 8 MB → `/uploads/…` |
| `POST /api/leads` | public (rate-limited) | each lead → `leads`, an email to `LEADS_NOTIFY_EMAIL`, and `LEAD_WEBHOOK_URL` |
| `GET /sitemap.xml` | public | home and every published property, with hreflang |
| `GET /api/admin/leads?status=&limit=&before=` · `PATCH /api/admin/leads/:id` `{status}` | Marketing, Super Admin | status: new / contacted / closed |
| `GET/POST /api/admin/users` · `PATCH/DELETE /api/admin/users/:id` | Super Admin | |

The website shows only published listings from the database; with none in a category it says so instead of showing samples.

## Search engines, analytics and lead delivery

- **Sitemap:** `/sitemap.xml` is built from the database on each request. Submit `https://<your domain>/sitemap.xml`
  in Google Search Console and Bing Webmaster Tools.
- **Per-page tags without JavaScript:** set `FRONTEND_DIST` to the built website (`elevare-frontend/dist`) and this
  server serves it, writing each page's title, description, canonical, hreflang (`en`, `en-TH`, `x-default`), Open
  Graph and JSON-LD (`RealEstateListing`, `BreadcrumbList`) plus a text version of the listings into the HTML; the
  home page lists every property so crawlers reach each one. The old `/properties` list addresses redirect (301) to `/`. Unknown pages answer 404. Set `SITE_URL` to the live domain.
- **Lead webhook:** `LEAD_WEBHOOK_URL` receives `{"event":"lead.created","lead":{…}}` for every lead (retried 3 times);
  with `LEAD_WEBHOOK_SECRET`, verify `X-Elevare-Signature: sha256=<HMAC-SHA256 of the raw body>`.
- **GA4** is configured in the frontend (`VITE_GA_MEASUREMENT_ID`).

## Production

`npm ci && npm run build && npm start`, with `NODE_ENV=production` behind HTTPS (this makes the session cookie `Secure`)
and a random `SESSION_SECRET` (required in production). The simplest setup is one server: build the website and set
`FRONTEND_DIST` so this server serves it with `/api` and `/uploads`. Otherwise serve the website elsewhere and proxy
`/api`, `/uploads` and `/sitemap.xml` to this server. If the API is on its own domain, set `FRONTEND_URL` / `CORS_ORIGINS` here and
`VITE_API_URL` in the frontend. If the two are on different sites, also set `COOKIE_SAMESITE=none`.
With Supabase, use the **transaction pooler** address (port 6543): the direct `db.<ref>.supabase.co` address is IPv6-only,
which most hosts (Vercel included) can't reach. Supabase backs up the database; back up the `UPLOAD_DIR` folder if you use it.
