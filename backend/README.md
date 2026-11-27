# Elevare backend

Node + TypeScript + Express API. It serves the property listings for the website, stores the website's leads, and handles
sign-in and roles for the admin dashboard (`/admin-login`, `/admin-dashboard` in `../elevare-frontend`).

| Service | Holds | |
|---|---|---|
| **Postgres** (Supabase) | everything: see tables below | required |
| **SMTP** | email to the team for each new lead | optional |
| **Claude API** (`ANTHROPIC_API_KEY`) | writes property drafts from photos + notes (Properties → Add with AI) | optional |

| Table | Rows |
|---|---|
| `admins` | dashboard accounts: `id` (uuid), `email` (lower-case, unique), `password` (bcrypt hash), `name`, `active`, `created_at`, `last_login_at` |
| `roles` | `name`, `description`, `pages` (page keys), `system` (the one built-in Super Admin role) |
| `admin_roles` | which employee has which roles (several allowed) |
| `sessions` | one per sign-in: `token_hash` (SHA-256 of the cookie token), `admin_id`, `expires_at` (expired ones are cleared on sign-in) |
| `listings` | the properties: `id` (listing id), `seq` (display order), the website's listing fields, `line` (short card text), `description` (full text for the property page), `photos` (gallery, cover first; `photo` mirrors the cover), `draft` + `published` (the status: live = published, draft = draft, hidden = neither), `ai` (notes an AI draft was written from + fields to check), `updated_by`… |
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
    aiWriter.ts        asks Claude for a listing (title, texts, rooms, features) from photos + notes
  routes/
    health.ts          GET  /api/health
    auth.ts            /api/auth/login, logout, me, password
    listings.ts        /api/listings (public), /api/admin/listings (+ photo upload)
    aiDrafts.ts        /api/admin/ai-drafts: one property's photos + notes → an AI-written draft
    leads.ts           /api/leads (public), /api/admin/leads
    users.ts           /api/admin/users (Employees management page)
    roles.ts           /api/admin/roles (read: Employees page; change: Super Admin)
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

## Roles and page access

The CEO (any **Super Admin**) decides who can open which dashboard page, in the dashboard under
**Employees management → Roles & access**:

- **Roles** are created, renamed and deleted there; each role ticks the pages it can open (`PAGES` in
  `src/lib/roles.ts`: Properties management, Employees management). Having a page means seeing it and working in it.
- **An employee can have several roles** and gets every page any of them allows. With no role they only see Account
  management, which is always available.
- **Super Admin** is a built-in role: every page (including future ones), can't be edited or deleted. Only Super Admins
  can change roles. There is always at least one active Super Admin, and you can't remove your own.
- **Employees management can be delegated**, safely: someone given that page can't change Super Admin accounts or their
  own roles, and can only hand out roles whose pages they have themselves.
- Every request is checked by the server (`requirePage` in `src/middleware/auth.ts`), so changes apply on the next click.

**Adding a page:** add it to `PAGES` in `src/lib/roles.ts`, guard its routes with `requirePage('<key>')`, and add it to
the dashboard sidebar. It then appears in Roles & access, granted to no role until the CEO ticks it.

## API

| Method & path | Who | |
|---|---|---|
| `GET /api/health` | public | API and database status |
| `POST /api/auth/login` `{email,password}` | anyone | sets an httpOnly session cookie: it ends when the browser closes (closing a tab keeps it), or after `SESSION_TTL_DAYS` (7) |
| `POST /api/auth/logout` · `GET /api/auth/me` · `POST /api/auth/password` | signed in | |
| `GET /api/listings` · `GET /api/listings/:id` | public | published listings, in the shape the website uses |
| `GET /api/admin/listings` | all roles | every listing, including hidden ones |
| `POST /api/admin/listings` · `PUT/DELETE /api/admin/listings/:id` | Properties page | up to 20 `photos`; `status`: `live` \| `draft` \| `hidden` |
| `GET /api/settings` | public | areas, market estimates, contact details |
| `GET /api/admin/settings` · `PUT /api/admin/settings/{areas,market,contact}` | Website settings page | `{value}`; areas: renames move properties, in-use areas can't be removed (409) |
| `PATCH /api/admin/listings/:id/status` · `POST /api/admin/listings/status` | Properties page | `{status}` for one, `{ids, status}` for several; going live clears the AI's "please check" list |
| `GET /api/admin/ai-drafts/status` · `POST /api/admin/ai-drafts` | Properties page | `{notes, photos, refCode?, mode?, type?, area?, price?}` (left out = read from the notes) → a draft listing (given code, or the next ELV code; 409 if taken); 503 without `ANTHROPIC_API_KEY` |
| `POST /api/admin/listings/delete` `{ids}` or `{all: true}` | Properties page | bulk delete → `{deleted}` |
| `POST /api/admin/listings/photo` (multipart `photo`) | Properties page | one JPG/PNG/WebP ≤ 8 MB per request (the dashboard sends several one by one) → its URL |
| `POST /api/leads` | public (rate-limited) | each lead → `leads`, an email to `LEADS_NOTIFY_EMAIL`, and `LEAD_WEBHOOK_URL` |
| `GET /sitemap.xml` | public | home and every published property, with hreflang |
| `GET /api/admin/leads?status=&limit=&before=` · `PATCH /api/admin/leads/:id` `{status}` | Super Admin (until a Leads page exists) | status: new / contacted / closed |
| `GET/POST /api/admin/users` · `PATCH/DELETE /api/admin/users/:id` | Employees page | `{email, name, password, roleIds}` |
| `GET /api/admin/roles` · `POST` · `PATCH/DELETE /api/admin/roles/:id` | read: Employees page; change: Super Admin | `{name, description, pages}` |

The website shows only published listings from the database; with none in a category it says so instead of showing samples.

## AI listing drafts

**Properties management → ✦ Add with AI** takes several properties at once. For each one, staff add photos and paste
their notes. The boxes for the ref code, rent/sale, type, area and price fill in from the notes as they type
(`elevare-frontend/src/lib/notesFacts.ts`) and can be changed by hand; any left empty, Claude reads from the notes
(type also from the photos). A price is only ever taken from an amount written in the notes ("70,000", "70k", "14.9M");
if the notes don't give one of the basics, no draft is created and the card says what's missing (422). Values Claude
read are marked "please check". Ref code: empty = the next ELV code; a code already in use is refused before the AI
runs. The dashboard uploads the photos, then sends their addresses with the notes to `POST /api/admin/ai-drafts`, one
property at a time; the server loads the first 8 photos itself (the host caps a request at ~4.4 MB, so photos never
travel in it). Claude (`AI_MODEL`, default `claude-opus-5-5`, with server-side refusal fallback) writes the title, the
short and full descriptions, bedrooms, bathrooms, sizes, amenities and features.

- Every result is a **draft**: hidden until someone opens it (Review), checks it, chooses "Live" and saves.
- Fields the AI estimated from the photos are listed in `ai.check` and marked "please check" in the editor until the
  listing first goes live; the notes it started from are kept in `ai.notes`. Publishing an unreviewed AI draft straight
  from the list asks first.

## Website settings (database, not code)

The areas, the market estimates behind "vs. area average", and the public contact details live in the `site_settings`
table (one JSON value per key: `areas`, `market`, `contact`; `src/lib/settings.ts`). `npm run db:migrate` fills it once
with the starting values; after that the database is the only source, edited in the dashboard under
**Website settings** (Super Admins, or any role granted that page).

- The website loads them from `GET /api/settings` before a page renders; the API checks properties against the
  current area list; the AI gets the area list and each area's other names; the home page's business data (email,
  phone, areas served) is filled from them.
- Areas: name, description, price level (1 = island average), province ("Phang Nga" areas aren't shown as
  "…, Phuket"), other names ("Khao Lak" → Phang Nga) used by the notes reader and the website search. Renaming an area
  moves its properties in the same transaction; an area with properties can't be removed.
- Secrets never go here: they stay in `.env` / Vercel environment variables.

## Listing status: live, draft, hidden

| Status | Website | Meant for |
|---|---|---|
| Live | shown | on the market |
| Draft | never | work in progress, or an AI draft waiting for review |
| Hidden | never | finished but off the market (let, sold, paused) |

Any property can move between the three at any time: in the editor (Status), from the list (the status menu on each
row), or several at once (select, then Publish / Move to draft / Hide). The count cards at the top filter the list.
- Sizes and ownership are kept only when the notes state them; the price, area, rent/sale and type are always the staff's.
- Set `ANTHROPIC_API_KEY` (backend `.env` and Vercel); without it the button explains that the AI isn't set up.
  Each property costs a few cents of Claude API usage.

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
