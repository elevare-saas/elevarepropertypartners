# Elevare Property Partners

One domain, one Node process:

| Address | Served by |
|---|---|
| `/`, `/properties/…`, `/admin-login`, `/admin-dashboard` | the website (`elevare-frontend/dist`), with per-page SEO tags |
| `/api/…` | the API (`backend`) |
| `/uploads/…` | uploaded listing photos |
| `/sitemap.xml`, `/robots.txt` | generated sitemap, static robots |

`backend` serves `../elevare-frontend/dist` automatically once it has been built (set `FRONTEND_DIST=off` to host the
website elsewhere). The website calls the API on the same domain (`VITE_API_URL` stays empty).

## Deploy (Linux server, Node 22.13+, nginx; database on Supabase)

```sh
# 1. code and dependencies
git clone … elevare && cd elevare
npm run install:all

# 2. settings
cp backend/.env.production.example backend/.env      # fill in SESSION_SECRET, domain, DATABASE_URL, leads
cp elevare-frontend/.env.example elevare-frontend/.env
#   VITE_WHATSAPP_NUMBER=447745334883 (required), VITE_GA_MEASUREMENT_ID=G-… (optional)

# 3. build the website and the API
npm run build

# 4. first admin (if the database has none yet)
npm run create-admin -- you@elevarepropertypartners.com "a-long-password"

# 5. run it, and keep it running across crashes and reboots
npm install -g pm2
npm run pm2:start
pm2 startup                                          # once: follow the command it prints

# 6. HTTPS on the domain
sudo cp deploy/nginx.conf /etc/nginx/sites-available/elevare
sudo ln -s /etc/nginx/sites-available/elevare /etc/nginx/sites-enabled/
sudo certbot --nginx -d elevarepropertypartners.com -d www.elevarepropertypartners.com
sudo nginx -t && sudo systemctl reload nginx
```

Check: `curl https://www.elevarepropertypartners.com/api/health` → `{"ok":true,"database":"up"}`.

## Update

```sh
git pull && npm run install:all && npm run build && npm run pm2:reload
```

The website's HTML is read once at start-up, so reload after every website build.

## Without nginx

Hosts that terminate HTTPS themselves (Render, Railway, a cloud load balancer): run `npm run build` then
`npm start`, point the host at `PORT`, and keep `TRUST_PROXY=1`.

## Changing the database password or address

1. Supabase → project → **Project Settings → Database → Reset database password** (copy it before confirming).
2. Put it in `backend/.env`: `DATABASE_URL=postgresql://postgres.<project-ref>:<new password>@…pooler.supabase.com:6543/postgres`.
3. `npm run vercel:db`: tests the new value, saves it in Vercel (never printed), redeploys the live site and checks it.

A wrong value never reaches Vercel: the command stops if the database rejects it. Locally the server says exactly what is
wrong (password rejected, wrong project id, Supabase's IPv6-only direct address, placeholder left in).

## Backups

The database is on Supabase (daily backups on Pro). Keep `backend/uploads/` if photos are stored on the server.

Details: [backend/README.md](backend/README.md), [elevare-frontend/README.md](elevare-frontend/README.md).
