# Elevare Property Concierge

React + TypeScript + Tailwind CSS (v4) version of the Elevare Phuket property concierge.
The original single-file page is kept for reference at `src/demo/demo.html`.

## Workflows

```sh
bun install        # or npm install
bun run dev        # start the development server
bun run lint       # ESLint + TypeScript
bun run format     # Prettier (format:check to only check)
bun run build      # production build
bun run start      # preview the production build
```

## Pages, search and analytics

| URL | Page |
|---|---|
| `/` | home page and concierge (listings from the API only) |
| `/properties/<name>-<id>` | one home, shown in the concierge's match view (the same page a Featured card opens); `<id>` is the property's unique ID |
| `/?start=rent`, `/?start=buy` | opens the home page's rent / buy journey (used by links on other pages) |
| anything else | 404 page (`noindex`) |

- **Settings** (`.env`, see `.env.example`): `VITE_SITE_URL` (live domain for canonical/hreflang/JSON-LD; default
  `https://www.elevarepropertypartners.com`) and `VITE_GA_MEASUREMENT_ID` (GA4, e.g. `G-XXXXXXXXXX`; empty = off).
- **SEO:** each page sets its title, description, canonical, hreflang (`en`, `en-TH`, `x-default`), Open Graph and
  JSON-LD (`src/lib/seo.ts`); `index.html` carries the business (`RealEstateAgent`, Phuket) and region tags
  (`geo.region` TH-83). `public/robots.txt` points to `/sitemap.xml`, which the API generates from the database.
  For crawlers that don't run JavaScript, serve the build from the backend (`FRONTEND_DIST`).
- **Analytics** (`src/lib/analytics.ts`): GA4 with Consent Mode v2 and a cookie banner. Events: `page_view`,
  `generate_lead` (concierge and property WhatsApp clicks; mark it as a key event in GA4), `view_item`, `contact`. No personal
  data is sent. The admin area is never tracked.

## Structure

Each page has its own folder in `pages/`. Components and hooks used by only one page live in that page's `components/`
and `hooks/` folders; code shared by several pages lives outside `pages/`. Imports use the `@/` alias for `src/`
(`import {useAuth} from '@/hooks/useAuth'`); `./` only for files next to each other. TypeScript runs in `strict` mode.

```
src/
  index.tsx               entry: picks the page for the URL and loads it on demand
  index.css               Tailwind theme tokens, breakpoints and the few global styles
  pages/
    home/                 the public website: / and /properties/<name>-<id>
      HomePage.tsx        landing page, then the concierge flow; keeps the URL and search tags in step with
                          the property on screen, and starts the rent / buy journey from /?start=
      loadListings.ts     loads the published listings from the API before the page renders (no sample fallback)
      components/
        ui.tsx            shared pieces: option card, chip, CTA, box, concierge bubble, property photo, "no homes"
        Stage.tsx         switches between the quiz and results steps
        Quiz.tsx          rent/buy, who, style, area, property, timing, budget, must-haves, confirm
        Results.tsx       matching, the match view (one property), compare, viewing booking, WhatsApp message
        LivePanel.tsx     live matches (sticky sidebar from 1000px, bottom sheet below)
        Typeahead.tsx     word suggestions for the free-text boxes
        landing/          the homepage sections, composed in Landing.tsx, top to bottom:
                          Hero (fixed example-property slideshow, rent / buy, search), FeaturedHomes (6 at a time,
                          show more / less), Highlights.Choose (4 promises + demo video), Highlights.Why (Compare
                          table + Areas tiles), Faq (+ WhatsApp), Highlights.Vision, Highlights.ContactBand;
                          parts.tsx holds Band, Heading and the rent / buy ModeButtons
    not-found/            404, and "this home is no longer available"
    admin-login/          /admin-login
      AdminLoginPage.tsx  email + password sign-in
    admin-dashboard/      /admin-dashboard
      AdminDashboardPage.tsx  sidebar layout, sections by role (the open section is in the URL: ?section=employees)
      hooks/
        useListings.ts        load listings; publish / hide / delete (one, selected or all) with a toast
        useListingFilters.ts  search, filters and summary counts
        useTeam.ts            load the team; change role / access / delete with a toast
      components/
        PropertiesPanel.tsx   list, filter, select, publish/hide, delete listings
        ListingEditor.tsx     add / edit a listing, photo upload
        EmployeesPanel.tsx    Super Admin: add people, change roles, disable, reset passwords
        AccountPanel.tsx      change your own password
  routes/
    AdminRoutes.tsx       the admin area: providers (router, toasts, auth) and the page for the URL
    guards.tsx            RequireAuth (signed out: /admin-login), GuestOnly (signed in: /admin-dashboard)
    paths.ts              every admin URL
    Navigate.tsx          redirect component used by the guards
  context/                app-wide state, each as a Context + Provider (read through the hooks below)
    auth/                 who is signed in: stored session first, confirmed by the server; logout; "session ended" on 401
    toast/                notifications: success / error, auto-closing or persistent (temporary passwords)
    router/               current URL as state, navigate() (History API, no router dependency)
  hooks/                  shared hooks
    useAuth.ts            useAuth(), useCurrentUser(), usePermission('listings.edit')
    useToast.ts           toast.success('Saved.'), toast.error(...)
    useRouter.ts          useRouter() gives {location, navigate}; useSearchParam('section')
    useQuery.ts           load data: {data, error, loading, reload, setData}; cancels stale requests
    useMutation.ts        run an action: {run, pending, error}; run() never throws, it returns {ok, data | error}
    useDocument.ts        useDocumentTitle, useNoIndex, useBodyClass, useLockBodyScroll, useEscapeKey
    useLatest.ts          ref to the latest value (stable callbacks)
  services/               one module per backend resource; each function is a typed API call
    authApi.ts            login({email, password}) gives the account + expiry; me, logout, changePassword
    listingsApi.ts        list, create, update, setPublished, remove, removeMany / removeAll, uploadPhoto
    usersApi.ts           list, create, update, remove
    apiBase.ts            API address (VITE_API_URL) and upload URLs
  lib/
    http.ts               request(): cookies, JSON / multipart, AbortSignal, ApiError with the server's message, 401 events
    session.ts            the signed-in session remembered in localStorage (never the token)
    seo.ts                per-page title, description, canonical, hreflang, Open Graph and JSON-LD; property URLs
    analytics.ts          GA4 with Consent Mode v2: lead, view and contact events
    whatsapp.ts           whatsappUrl(text): every contact button opens WhatsApp
    roles.ts              role labels and descriptions, can(user, permission)
    format.ts             cx, thb, when, digits
  types/admin.ts          AdminUser, AdminListing, ListingInput, Role, Permission... (the API's shapes)
  components/
    site/SiteChrome.tsx     public header, footer, cookie banner, WhatsApp icon
    site/ListingCard.tsx    a property card (a real link to /properties/<name>-<id>)
    site/PropertyImage.tsx  a listing's photo, or a neutral placeholder
    admin/kit.tsx           UI kit shared by the admin pages (brand, buttons, form fields, cards, alerts, badges, side sheet)
    admin/Toaster.tsx       where toasts appear
  concierge/              data and logic of the concierge
    data.ts               CONFIG (WhatsApp number, email, lead endpoint), market figures, areas, personas, LISTINGS
    engine.ts             matching score, market comparison, free-text parser, concierge copy, message builder
    content.ts            the homepage FAQ
    photos.ts             listing photo sizes (credits for the bundled /photos files are in photos.json)
    store.ts              app state (S), current step and back-trail, render/update signals
    actions.ts            everything a tap or input does; opening a property re-reads it from the API first
  assets/                 logo
  demo/demo.html          the original single-file page, for reference
public/
  hero/                   the hero slideshow (AI-generated example properties, illustrative)
  contact/                the contact band background (AI-generated; replace with a real team photo)
  videos/                 the demo video and its cover frame
  photos/                 bundled photos that listings can use
```

**Adding an admin page:** create `pages/<name>/<Name>Page.tsx` (plus `components/` and `hooks/` if it needs them), add its URL
to `routes/paths.ts` and a line to `ROUTES` in `routes/AdminRoutes.tsx`, wrapped in `<RequireAuth>`. A new API call goes
in the matching `services/*Api.ts`; components load data with `useQuery` and save with `useMutation`, never `fetch` directly.

**Listings come only from the database.** The page loads the published listings from `/api/listings`; opening a property
(card, link or a switch in the match view) fetches it again from `/api/listings/<id>`. If the API can't be reached the page
says so instead of showing old or sample data.

## Admin dashboard

`/admin-login` and `/admin-dashboard` (`src/pages/admin-login/`, `src/pages/admin-dashboard/`, guarded by
`src/routes/AdminRoutes.tsx`) let the team manage the listings and the team, with access set by role (Super Admin,
Marketing Manager, Viewer). They need the API in `../backend` running (`npm run dev` there); the Vite dev server proxies
`/api`, `/uploads` and `/sitemap.xml` to it.

To go live: set `VITE_WHATSAPP_NUMBER` (required; the build stops without it), `VITE_SITE_URL` and
`VITE_GA_MEASUREMENT_ID` in `.env`, and manage the real rentals and sales in the dashboard.

Tailwind is loaded **without preflight** on purpose: the original page relies on browser default styles,
so the React version renders pixel-for-pixel the same. Breakpoints match the original exactly
(`upto480`, `upto520`, `upto560`, `upto600`, `upto999`, `from1000` variants in `index.css`).
