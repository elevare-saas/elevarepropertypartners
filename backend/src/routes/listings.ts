import {Router} from 'express';
import multer from 'multer';
import {randomBytes} from 'node:crypto';
import {extname} from 'node:path';
import {env} from '../config/env.js';
import {
  isUniqueViolation,
  LISTING_COLS,
  one,
  query,
  REF_CODE_INDEX,
  type ListingAi,
  type ListingRow
} from '../db/pg.js';
import {requirePage} from '../middleware/auth.js';
import {canStorePhotos, deletePhoto, isValidPhoto, savePhoto} from '../lib/photoStore.js';

/* must match the frontend's AREAS and AMEN (src/concierge/data.ts): the matching engine prices by area and scores by amenity */
export const AREAS = [
  'Kata',
  'Karon',
  'Rawai',
  'Nai Harn',
  'Chalong',
  'Phuket Town',
  'Patong',
  'Kamala',
  'Surin',
  'Bang Tao',
  'Cape Yamu'
];
export const AMENITIES = [
  'pool',
  'fibre',
  'workspace',
  'cowork',
  'seaview',
  'beach',
  'quiet',
  'amenities',
  'gym',
  'school',
  'pets',
  'cleaning',
  'invoice',
  'commute',
  'furnished'
];
export const TYPES = ['villa', 'condo', 'townhouse'];

type Row = ListingRow;

/* the shape the website uses (src/concierge/data.ts → Listing) */
const toListing = (r: Row) => ({
  id: r.id,
  mode: r.mode,
  name: r.name,
  area: r.area,
  type: r.type,
  beds: r.beds,
  ...(r.sqm != null && {sqm: r.sqm}),
  ...(r.landSqm != null && {land: r.landSqm}),
  ...(r.baths != null && {baths: r.baths}),
  price: r.price,
  ...(r.own != null && {own: r.own}),
  ...(r.rent != null && {rent: r.rent}),
  am: r.am,
  ex: r.ex,
  hue: r.hue,
  line: r.line,
  ...(r.description && {description: r.description}),
  ...(r.photos[0] && {photo: r.photos[0], photos: r.photos})
});
/* the reference code and AI notes are internal: admin responses only */
export const toAdmin = (r: Row) => ({
  ...toListing(r),
  description: r.description,
  photos: r.photos,
  refCode: r.refCode,
  draft: r.draft,
  ai: r.ai,
  published: r.published,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  updatedBy: r.updatedBy
});
const get = (id: string) => one<Row>(`select ${LISTING_COLS} from listings where id = $1`, [id]);

/* uploaded photos are deleted with their listing (or when taken out of its gallery); bundled /photos/ ones stay */
const removePhotos = (urls: string[]) => Promise.all([...new Set(urls)].map(deletePhoto));
export const MAX_PHOTOS = 20;
export const MAX_DESCRIPTION = 5000;

const int = (v: unknown) => (typeof v === 'number' ? v : Number(v));
/* an optional area in m²: blank → null */
function optionalArea(v: unknown, label: string, errors: string[]) {
  if (v === undefined || v === null || v === '') return null;
  const n = int(v);
  if (!Number.isInteger(n) || n < 10 || n > 1_000_000)
    errors.push(`${label} must be a whole number of m² (10 or more).`);
  return n;
}
export function validate(b: Record<string, unknown>) {
  const e: string[] = [];
  const mode = b.mode,
    type = b.type,
    area = b.area;
  const name = String(b.name ?? '').trim(),
    line = String(b.line ?? '').trim(),
    description = String(b.description ?? '')
      .replace(/\r\n?/g, '\n')
      .trim();
  if (description.length > MAX_DESCRIPTION) e.push(`Full description: up to ${MAX_DESCRIPTION} characters.`);
  const beds = int(b.beds),
    price = int(b.price),
    hue = b.hue == null ? 260 : int(b.hue);
  if (mode !== 'rent' && mode !== 'buy') e.push('Choose rent or sale.');
  if (!name) e.push('Listing title is required.');
  if (!AREAS.includes(area as string)) e.push('Choose an area.');
  if (!TYPES.includes(type as string)) e.push('Choose a property type.');
  if (!Number.isInteger(beds) || beds < 1 || beds > 20) e.push('Bedrooms must be a whole number from 1 to 20.');
  /* optional: blank → null */
  let baths: number | null = null;
  if (b.baths !== undefined && b.baths !== null && b.baths !== '') {
    baths = int(b.baths);
    if (!Number.isInteger(baths) || baths < 1 || baths > 20) e.push('Bathrooms must be a whole number from 1 to 20.');
  }
  const sqm = optionalArea(b.sqm, 'Floor area', e),
    landSqm = optionalArea(b.land, 'Land area', e);
  const refCode = String(b.refCode ?? '')
    .trim()
    .toUpperCase();
  if (refCode && !/^[A-Z0-9][A-Z0-9._-]{0,29}$/.test(refCode))
    e.push('Reference code: letters, numbers, dots or dashes only (up to 30), e.g. ELV-001.');
  if (!Number.isSafeInteger(price) || price <= 0)
    e.push(mode === 'buy' ? 'Sale price is required.' : 'Monthly rent is required.');
  const am = Array.isArray(b.am) ? [...new Set(b.am.filter((a): a is string => AMENITIES.includes(a as string)))] : [];
  const ex = Array.isArray(b.ex)
    ? b.ex
        .map(x => String(x).trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  let own: string | null = null,
    rent: number | null = null;
  /* both optional for homes for sale: the website hides what's missing */
  if (mode === 'buy') {
    own = String(b.own ?? '').trim() || null;
    if (b.rent !== undefined && b.rent !== null && b.rent !== '') {
      rent = int(b.rent);
      if (!Number.isSafeInteger(rent) || rent <= 0) e.push('Estimated monthly rent must be a whole number above 0.');
    }
  }
  /* the gallery, cover first; an older client may still send just `photo` */
  const sent = Array.isArray(b.photos) ? b.photos : b.photo ? [b.photo] : [];
  const photos = [...new Set(sent.filter(isValidPhoto))];
  if (photos.length > MAX_PHOTOS) e.push(`Up to ${MAX_PHOTOS} photos per property.`);
  /* a draft waits for review: it is never on the website */
  const draft = b.draft === true;
  return {
    errors: e,
    value: {
      mode: mode as Row['mode'],
      name,
      area: area as string,
      type: type as string,
      beds,
      sqm,
      landSqm,
      baths,
      refCode: refCode || null,
      price,
      own,
      rent,
      am,
      ex,
      hue: Number.isFinite(hue) ? ((Math.round(hue) % 360) + 360) % 360 : 260,
      line,
      description,
      photos,
      draft,
      published: !draft && b.published !== false
    }
  };
}

/* validated fields in the column order of the insert and update statements below */
const values = (v: ReturnType<typeof validate>['value']) => [
  v.mode,
  v.name,
  v.area,
  v.type,
  v.beds,
  v.sqm,
  v.price,
  v.own,
  v.rent,
  v.am,
  v.ex,
  v.hue,
  v.line,
  v.photos[0] ?? null,
  v.published,
  v.refCode,
  v.landSqm,
  v.baths,
  v.photos,
  v.draft,
  v.description
];
export type Listing = ReturnType<typeof validate>['value'];
export const refTaken = (e: unknown) =>
  isUniqueViolation(e) && (e as {constraint?: string}).constraint === REF_CODE_INDEX;
const REF_TAKEN = 'This reference code is already used by another property.';

/* a new listing (with the AI notes for an AI draft). Random 8-character id, retried on the rare collision;
   seq (display order) comes from a sequence. A taken reference code is rethrown (see refTaken). */
export async function insertListing(v: Listing, by: string, ai: ListingAi | null = null): Promise<Row> {
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await one<Row>(
        `insert into listings (id, mode, name, area, type, beds, sqm, price, own, rent, am, ex, hue, line, photo,
                               published, ref_code, land_sqm, baths, photos, draft, description, updated_by, ai)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
                 $23, $24)
         returning ${LISTING_COLS}`,
        [randomBytes(4).toString('hex').toUpperCase(), ...values(v), by, ai]
      );
      return row!;
    } catch (e) {
      if (refTaken(e) || !isUniqueViolation(e) || attempt === 4) throw e;
    }
  }
}

/* ---------- public ---------- */
export const publicListings = Router();
publicListings.get('/', async (_req, res) => {
  /* "rent" before "buy", each in display order */
  const {rows} = await query<Row>(`select ${LISTING_COLS} from listings where published order by mode desc, seq`);
  res.set('Cache-Control', 'no-cache').json({listings: rows.map(toListing)});
});
publicListings.get('/:id', async (req, res) => {
  const row = await one<Row>(`select ${LISTING_COLS} from listings where id = $1 and published`, [
    String(req.params.id)
  ]);
  if (!row) return res.status(404).json({error: 'This property is no longer available.'});
  res.set('Cache-Control', 'no-cache').json({listing: {...toListing(row), updatedAt: row.updatedAt}});
});

/* ---------- admin ---------- */
export const adminListings = Router();

adminListings.get('/', requirePage('properties'), async (_req, res) => {
  const {rows} = await query<Row>(`select ${LISTING_COLS} from listings order by updated_at desc, seq desc`);
  res.json({listings: rows.map(toAdmin), areas: AREAS, amenities: AMENITIES});
});

adminListings.post('/', requirePage('properties'), async (req, res) => {
  const {errors, value: v} = validate(req.body ?? {});
  if (errors.length) return res.status(400).json({error: errors.join(' '), errors});
  try {
    return res.status(201).json({listing: toAdmin(await insertListing(v, req.user!.email))});
  } catch (e) {
    if (refTaken(e)) return res.status(409).json({error: REF_TAKEN});
    throw e;
  }
});

adminListings.put('/:id', requirePage('properties'), async (req, res) => {
  const old = await get(String(req.params.id));
  if (!old) return res.status(404).json({error: 'Listing not found.'});
  const {errors, value: v} = validate(req.body ?? {});
  if (errors.length) return res.status(400).json({error: errors.join(' '), errors});
  let row;
  try {
    row = await one<Row>(
      `update listings set mode = $2, name = $3, area = $4, type = $5, beds = $6, sqm = $7, price = $8, own = $9,
              rent = $10, am = $11, ex = $12, hue = $13, line = $14, photo = $15, published = $16,
              ref_code = $17, land_sqm = $18, baths = $19, photos = $20, draft = $21, description = $22, updated_by = $23,
              updated_at = now()
        where id = $1
        returning ${LISTING_COLS}`,
      [old.id, ...values(v), req.user!.email]
    );
  } catch (e) {
    if (refTaken(e)) return res.status(409).json({error: REF_TAKEN});
    throw e;
  }
  await removePhotos(old.photos.filter(p => !v.photos.includes(p)));
  res.json({listing: toAdmin(row!)});
});

/* publishing a draft approves it: it stops being a draft */
adminListings.patch('/:id/published', requirePage('properties'), async (req, res) => {
  const old = await get(String(req.params.id));
  if (!old) return res.status(404).json({error: 'Listing not found.'});
  const published = !!req.body?.published;
  const row = await one<Row>(
    `update listings set published = $2, draft = draft and not $2, updated_by = $3, updated_at = now()
      where id = $1 returning ${LISTING_COLS}`,
    [old.id, published, req.user!.email]
  );
  res.json({listing: toAdmin(row!)});
});

adminListings.delete('/:id', requirePage('properties'), async (req, res) => {
  const old = await one<Pick<Row, 'photos'>>('delete from listings where id = $1 returning photos', [
    String(req.params.id)
  ]);
  if (!old) return res.status(404).json({error: 'Listing not found.'});
  await removePhotos(old.photos);
  res.json({ok: true});
});

/* {ids: [...]} deletes those; {all: true} deletes every listing → {deleted} */
adminListings.post('/delete', requirePage('properties'), async (req, res) => {
  const {ids, all} = req.body ?? {};
  let deleted;
  if (all === true) deleted = await query<Pick<Row, 'photos'>>('delete from listings returning photos');
  else if (Array.isArray(ids) && ids.length && ids.length <= 1000 && ids.every(i => typeof i === 'string'))
    deleted = await query<Pick<Row, 'photos'>>('delete from listings where id = any($1) returning photos', [ids]);
  else return res.status(400).json({error: 'Choose the properties to delete.'});
  await removePhotos(deleted.rows.flatMap(r => r.photos));
  res.json({deleted: deleted.rowCount ?? deleted.rows.length});
});

/* photo upload: jpg/png/webp up to UPLOAD_MAX_MB → Vercel Blob or UPLOAD_DIR (lib/photoStore.ts) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: env.limits.uploadMaxMb * 1024 * 1024, files: 1},
  fileFilter: (_req, f, cb) =>
    cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype) && /\.(jpe?g|png|webp)$/i.test(f.originalname))
});
adminListings.post('/photo', requirePage('properties'), (req, res, next) => {
  if (!canStorePhotos())
    return res.status(503).json({error: 'Photo storage is not set up yet (BLOB_READ_WRITE_TOKEN).'});
  upload.single('photo')(req, res, err => {
    if (err)
      return res.status(400).json({
        error:
          err.code === 'LIMIT_FILE_SIZE' ? `Photo must be ${env.limits.uploadMaxMb} MB or smaller.` : 'Upload failed.'
      });
    const f = req.file;
    if (!f) return res.status(400).json({error: 'Choose a JPG, PNG or WebP photo.'});
    savePhoto(f.buffer, extname(f.originalname).toLowerCase(), f.mimetype).then(
      url => res.status(201).json({url}),
      next
    );
  });
});
