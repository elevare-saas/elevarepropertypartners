# Elevare backend

Node + TypeScript + Express API. It serves the property listings for the website, stores the website's leads, and handles
sign-in and roles for the admin dashboard (`/admin-login`, `/admin-dashboard` in `../elevare-frontend`).

| Service | Holds | |
|---|---|---|
| **MongoDB 6+** (local or Atlas) | everything: see collections below | required |
| **SMTP** | email to the team for each new lead | optional |

| Collection | Documents |
|---|---|
| `admins` | dashboard accounts: `_id`, `email` (lower-case, unique), `role`, `password` (bcrypt hash), `name`, `active`, `createdAt`, `lastLoginAt` |
| `sessions` | one per sign-in: `_id` (SHA-256 of the cookie token), `adminId`, `expiresAt` (TTL index: deleted automatically) |
| `listings` | the properties: `_id` (listing id), `seq` (display order), the website's listing fields, `published`, `updatedBy`… |
| `counters` | the next listing `seq` |
| `leads` | website enquiries and viewing requests, with `status` new / contacted / closed |

Needs **Node 22+**.

## Structure

```
src/
  server.ts            entry point: connect to MongoDB (indexes) → seed → listen; graceful shutdown
  app.ts               the Express app: middleware + routes (no side effects)
  config/env.ts        all settings, read from environment variables (.env) and validated at start-up
  db/
    mongo.ts           MongoDB connection (official driver), collection types, indexes
    seed.ts            first start: sample listings + first Super Admin
    seed-listings.json the 19 sample listings the website shipped with
  middleware/
    auth.ts            loadUser (session cookie → req.user), requireLogin, requirePermission
    security.ts        CORS policy + refuses cross-site write requests (CSRF)
    errors.ts          request log, 404, error handler
  lib/
    roles.ts           roles, permissions, public user shape
    sessions.ts        signed cookie sessions (random token, stored hashed in MongoDB)
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
cp .env.example .env        # at least MONGODB_URI; also SESSION_SECRET, ADMIN_EMAIL / ADMIN_PASSWORD
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

**Configuration:** every setting is documented in [.env.example](.env.example), grouped as server, MongoDB,
website/CORS, sessions & cookies, email, limits, and first Super Admin. Values are validated at start-up: if any is
wrong, the server lists every problem and exits.

On start the server connects to MongoDB and creates the indexes (collections are created on first use), and on an empty
database loads the 19 sample listings and creates the first Super Admin. If `ADMIN_PASSWORD` is empty, a random password is printed **once**.

For local development, run `npm run dev` here and `npm run dev` in `../elevare-frontend`. Vite proxies `/api` and `/uploads`
to port 4000. Then open http://localhost:3000/admin-dashboard.

**Adding admins by hand** (mongosh, Compass, Atlas): store `email`, `password` and `role`. Email case doesn't matter. A
plain-text password works once and is replaced by a bcrypt hash at that first sign-in; prefer `npm run create-admin` or
Employees management so no plain password is ever stored. An account with `active: false` or a role other than `super_admin` /
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
| `GET /api/health` | public | API and MongoDB status |
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

The website shows only published listings from MongoDB; with none in a category it says so instead of showing samples.

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
With MongoDB Atlas, paste its `mongodb+srv://` address (TLS is automatic) and allow the server's IP. Back up MongoDB and the
`UPLOAD_DIR` folder.
