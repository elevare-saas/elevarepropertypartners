import {Router} from 'express';
import multer from 'multer';
import {randomBytes} from 'node:crypto';
import {extname} from 'node:path';
import {env} from '../config/env.js';
import {isUniqueViolation, LISTING_COLS, one, query, type ListingRow} from '../db/pg.js';
import {requirePermission} from '../middleware/auth.js';
import {canStorePhotos, deletePhoto, isValidPhoto, savePhoto} from '../lib/photoStore.js';

/* must match the frontend's AREAS and AMEN (src/concierge/data.ts): the matching engine prices by area and scores by amenity */
const AREAS = [
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
const AMENITIES = [
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
const TYPES = ['villa', 'condo', 'townhouse'];

type Row = ListingRow;

/* the shape the website uses (src/concierge/data.ts → Listing) */
const toListing = (r: Row) => ({
  id: r.id,
  mode: r.mode,
  name: r.name,
  area: r.area,
  type: r.type,
  beds: r.beds,
  sqm: r.sqm,
  price: r.price,
  ...(r.own != null && {own: r.own}),
  ...(r.rent != null && {rent: r.rent}),
  am: r.am,
  ex: r.ex,
  hue: r.hue,
  line: r.line,
  ...(r.photo && {photo: r.photo})
});
const toAdmin = (r: Row) => ({
  ...toListing(r),
  published: r.published,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  updatedBy: r.updatedBy
});
const get = (id: string) => one<Row>(`select ${LISTING_COLS} from listings where id = $1`, [id]);

/* uploaded photos are deleted with their listing; bundled /photos/ ones stay */
const removePhotos = (rows: Pick<Row, 'photo'>[]) => Promise.all(rows.map(r => deletePhoto(r.photo)));

const int = (v: unknown) => (typeof v === 'number' ? v : Number(v));
function validate(b: Record<string, unknown>) {
  const e: string[] = [];
  const mode = b.mode,
    type = b.type,
    area = b.area;
  const name = String(b.name ?? '').trim(),
    line = String(b.line ?? '').trim();
  const beds = int(b.beds),
    sqm = int(b.sqm),
    price = int(b.price),
    hue = b.hue == null ? 260 : int(b.hue);
  if (mode !== 'rent' && mode !== 'buy') e.push('Choose rent or sale.');
  if (!name) e.push('Name is required.');
  if (!AREAS.includes(area as string)) e.push('Choose an area.');
  if (!TYPES.includes(type as string)) e.push('Choose a property type.');
  if (!Number.isInteger(beds) || beds < 1 || beds > 20) e.push('Bedrooms must be a whole number from 1 to 20.');
  if (!Number.isInteger(sqm) || sqm < 10) e.push('Size must be at least 10 sqm.');
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
  if (mode === 'buy') {
    own = String(b.own ?? '').trim();
    rent = int(b.rent);
    if (!own) e.push('Ownership (e.g. "Foreign freehold") is required for homes for sale.');
    if (!Number.isSafeInteger(rent) || rent <= 0)
      e.push('Estimated monthly rent is required for homes for sale (used for the yield).');
  }
  const photo = isValidPhoto(b.photo) ? b.photo : null;
  return {
    errors: e,
    value: {
      mode: mode as Row['mode'],
      name,
      area: area as string,
      type: type as string,
      beds,
      sqm,
      price,
      own,
      rent,
      am,
      ex,
      hue: Number.isFinite(hue) ? ((Math.round(hue) % 360) + 360) % 360 : 260,
      line,
      photo,
      published: b.published !== false
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
  v.photo,
  v.published
];

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

adminListings.get('/', requirePermission('listings.view'), async (_req, res) => {
  const {rows} = await query<Row>(`select ${LISTING_COLS} from listings order by updated_at desc, seq desc`);
  res.json({listings: rows.map(toAdmin), areas: AREAS, amenities: AMENITIES});
});

adminListings.post('/', requirePermission('listings.edit'), async (req, res) => {
  const {errors, value: v} = validate(req.body ?? {});
  if (errors.length) return res.status(400).json({error: errors.join(' '), errors});
  /* random 8-character id; retried on the rare collision. seq (display order) comes from a sequence */
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await one<Row>(
        `insert into listings (id, mode, name, area, type, beds, sqm, price, own, rent, am, ex, hue, line, photo,
                               published, updated_by)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         returning ${LISTING_COLS}`,
        [randomBytes(4).toString('hex').toUpperCase(), ...values(v), req.user!.email]
      );
      return res.status(201).json({listing: toAdmin(row!)});
    } catch (e) {
      if (!isUniqueViolation(e) || attempt === 4) throw e;
    }
  }
});

adminListings.put('/:id', requirePermission('listings.edit'), async (req, res) => {
  const old = await get(String(req.params.id));
  if (!old) return res.status(404).json({error: 'Listing not found.'});
  const {errors, value: v} = validate(req.body ?? {});
  if (errors.length) return res.status(400).json({error: errors.join(' '), errors});
  const row = await one<Row>(
    `update listings set mode = $2, name = $3, area = $4, type = $5, beds = $6, sqm = $7, price = $8, own = $9,
            rent = $10, am = $11, ex = $12, hue = $13, line = $14, photo = $15, published = $16,
            updated_by = $17, updated_at = now()
      where id = $1
      returning ${LISTING_COLS}`,
    [old.id, ...values(v), req.user!.email]
  );
  if (old.photo !== v.photo) await removePhotos([old]);
  res.json({listing: toAdmin(row!)});
});

adminListings.patch('/:id/published', requirePermission('listings.edit'), async (req, res) => {
  const old = await get(String(req.params.id));
  if (!old) return res.status(404).json({error: 'Listing not found.'});
  const published = !!req.body?.published;
  const row = await one<Row>(
    `update listings set published = $2, updated_by = $3, updated_at = now() where id = $1 returning ${LISTING_COLS}`,
    [old.id, published, req.user!.email]
  );
  res.json({listing: toAdmin(row!)});
});

adminListings.delete('/:id', requirePermission('listings.edit'), async (req, res) => {
  const old = await one<Pick<Row, 'photo'>>('delete from listings where id = $1 returning photo', [
    String(req.params.id)
  ]);
  if (!old) return res.status(404).json({error: 'Listing not found.'});
  await removePhotos([old]);
  res.json({ok: true});
});

/* {ids: [...]} deletes those; {all: true} deletes every listing → {deleted} */
adminListings.post('/delete', requirePermission('listings.edit'), async (req, res) => {
  const {ids, all} = req.body ?? {};
  let deleted;
  if (all === true) deleted = await query<Pick<Row, 'photo'>>('delete from listings returning photo');
  else if (Array.isArray(ids) && ids.length && ids.length <= 1000 && ids.every(i => typeof i === 'string'))
    deleted = await query<Pick<Row, 'photo'>>('delete from listings where id = any($1) returning photo', [ids]);
  else return res.status(400).json({error: 'Choose the properties to delete.'});
  await removePhotos(deleted.rows);
  res.json({deleted: deleted.rowCount ?? deleted.rows.length});
});

/* photo upload: jpg/png/webp up to UPLOAD_MAX_MB → Vercel Blob or UPLOAD_DIR (lib/photoStore.ts) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: env.limits.uploadMaxMb * 1024 * 1024, files: 1},
  fileFilter: (_req, f, cb) =>
    cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype) && /\.(jpe?g|png|webp)$/i.test(f.originalname))
});
adminListings.post('/photo', requirePermission('listings.edit'), (req, res, next) => {
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
