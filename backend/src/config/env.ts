/* environment variables, checked once at start-up; all problems are reported together (see .env.example) */
import {existsSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const problems: string[] = [];
const raw = (name: string) => process.env[name]?.trim() ?? '';

function str(name: string, fallback = '') {
  return raw(name) || fallback;
}
function required(name: string) {
  const v = raw(name);
  if (!v) problems.push(`${name} is required.`);
  return v;
}
function int(name: string, fallback: number, min = 0) {
  const v = raw(name);
  if (!v) return fallback;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min) {
    problems.push(`${name} must be a whole number ≥ ${min} (got "${v}").`);
    return fallback;
  }
  return n;
}
function bool(name: string, fallback: boolean) {
  const v = raw(name).toLowerCase();
  if (!v) return fallback;
  if (['true', '1', 'yes'].includes(v)) return true;
  if (['false', '0', 'no'].includes(v)) return false;
  problems.push(`${name} must be true or false (got "${v}").`);
  return fallback;
}
function oneOf<T extends string>(name: string, options: readonly T[], fallback: T): T {
  const v = raw(name).toLowerCase();
  if (!v) return fallback;
  if (!options.includes(v as T)) {
    problems.push(`${name} must be one of ${options.join(', ')} (got "${v}").`);
    return fallback;
  }
  return v as T;
}
function origin(name: string, value: string) {
  try {
    return new URL(value).origin;
  } catch {
    problems.push(`${name} must be a full URL like https://example.com (got "${value}").`);
    return '';
  }
}
/* '' when unset; a full http(s) URL otherwise */
function optionalUrl(name: string) {
  const v = raw(name);
  if (v && !/^https?:\/\/[^\s]+$/.test(v)) problems.push(`${name} must be a full http(s) URL (got "${v}").`);
  return v;
}
const list = (name: string) =>
  raw(name)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const nodeEnv = str('NODE_ENV', 'development');
const isProd = nodeEnv === 'production';

/* ---- website / CORS ---- */
const frontendUrl = str('FRONTEND_URL', 'http://localhost:3000').replace(/\/+$/, '');
const allowedOrigins = [
  ...new Set(
    [origin('FRONTEND_URL', frontendUrl), ...list('CORS_ORIGINS').map(o => origin('CORS_ORIGINS', o))].filter(Boolean)
  )
];

/* the built website to serve from this server (one domain: website at /, API at /api).
   Empty: ../elevare-frontend/dist when it has been built; "off": the website is hosted elsewhere. */
function websiteDir() {
  const v = raw('FRONTEND_DIST');
  if (v.toLowerCase() === 'off') return '';
  const dir = v ? resolve(v) : fileURLToPath(new URL('../../../elevare-frontend/dist', import.meta.url));
  if (existsSync(join(dir, 'index.html'))) return dir;
  if (v)
    problems.push(
      `FRONTEND_DIST has no index.html (${dir}). Build the website first: cd elevare-frontend && npm run build`
    );
  return '';
}

/* public address of the website: canonical URLs, sitemap, structured data */
const siteUrl = str('SITE_URL', frontendUrl).replace(/\/+$/, '');
origin('SITE_URL', siteUrl);

/* ---- sessions & cookies ---- */
const DEV_SECRET = 'dev-only-insecure-session-secret-change-me';
let sessionSecret = raw('SESSION_SECRET');
if (!sessionSecret) {
  if (isProd) problems.push('SESSION_SECRET is required in production (at least 32 random characters).');
  sessionSecret = DEV_SECRET;
} else if (sessionSecret.length < 32) problems.push('SESSION_SECRET must be at least 32 characters.');
const cookieSameSite = oneOf('COOKIE_SAMESITE', ['lax', 'strict', 'none'] as const, 'lax');
const cookieSecure = bool('COOKIE_SECURE', isProd);
if (cookieSameSite === 'none' && !cookieSecure)
  problems.push('COOKIE_SAMESITE=none needs COOKIE_SECURE=true (browsers reject it otherwise).');

/* ---- email ---- */
const smtpHost = str('SMTP_HOST');
const smtpPort = int('SMTP_PORT', 587, 1);

export const env = {
  nodeEnv,
  isProd,
  port: int('PORT', 4000, 1),
  /* Express "trust proxy": loopback, a number of hops, or true behind a cloud load balancer */
  trustProxy: str('TRUST_PROXY', 'loopback'),
  logLevel: oneOf('LOG_LEVEL', ['error', 'warn', 'info', 'debug'] as const, isProd ? 'info' : 'debug'),

  /* Postgres (Supabase): the transaction pooler address, postgresql://postgres.<ref>:<password>@…pooler.supabase.com:6543/postgres */
  db: {
    url: required('DATABASE_URL'),
    /* small on serverless: each warm function instance keeps its own pool */
    poolMax: int('DATABASE_POOL_MAX', process.env.VERCEL ? 3 : 10, 1)
  },

  frontendUrl,
  siteUrl,
  allowedOrigins,
  /* built website (elevare-frontend/dist) to serve with per-page SEO tags; empty = the website is hosted elsewhere */
  frontendDist: websiteDir(),

  /* Vercel Blob read-write token: listing photos go there instead of UPLOAD_DIR */
  blobToken: raw('BLOB_READ_WRITE_TOKEN'),

  leadWebhook: {
    url: optionalUrl('LEAD_WEBHOOK_URL'),
    secret: raw('LEAD_WEBHOOK_SECRET')
  },

  session: {
    secret: sessionSecret,
    usingDevSecret: sessionSecret === DEV_SECRET,
    cookieName: str('SESSION_COOKIE_NAME', 'elevare_session'),
    ttlDays: int('SESSION_TTL_DAYS', 7, 1),
    cookieDomain: str('COOKIE_DOMAIN') || undefined,
    cookieSecure,
    cookieSameSite
  },

  mail: {
    enabled: !!smtpHost,
    host: smtpHost,
    port: smtpPort,
    secure: bool('SMTP_SECURE', smtpPort === 465),
    user: str('SMTP_USER'),
    pass: str('SMTP_PASS'),
    from: str('MAIL_FROM', 'Elevare Property Partners <no-reply@elevarepropertypartners.com>'),
    leadsNotify: list('LEADS_NOTIFY_EMAIL')
  },

  limits: {
    jsonBody: str('JSON_BODY_LIMIT', '200kb'),
    uploadDir: resolve(str('UPLOAD_DIR', 'uploads')),
    uploadMaxMb: int('UPLOAD_MAX_MB', 8, 1),
    loginMaxAttempts: int('LOGIN_MAX_ATTEMPTS', 8, 1),
    loginWindowMinutes: int('LOGIN_WINDOW_MINUTES', 15, 1),
    leadsPerHourPerIp: int('LEADS_PER_HOUR_PER_IP', 20, 1)
  },

  admin: {
    email: str('ADMIN_EMAIL', 'admin@elevarepropertypartners.com').toLowerCase(),
    password: raw('ADMIN_PASSWORD')
  }
};

if (env.mail.enabled && !env.mail.from) problems.push('MAIL_FROM is required when SMTP_HOST is set.');

if (problems.length) {
  console.error('Configuration errors (check your .env, see .env.example):\n  - ' + problems.join('\n  - '));
  process.exit(1);
}
