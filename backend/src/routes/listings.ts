import {Router} from 'express';
import multer from 'multer';
import {randomBytes} from 'node:crypto';
import {extname} from 'node:path';
import {env} from '../config/env.js';
import {col, isDuplicateKey, nextSeq, type ListingDoc} from '../db/mongo.js';
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

type Row = ListingDoc;

/* the shape the website uses (src/concierge/data.ts → Listing) */
const toListing = (r: Row) => ({
  id: r._id,
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
const get = (id: string) => col.listings().findOne({_id: id});

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

/* ---------- public ---------- */
export const publicListings = Router();
publicListings.get('/', async (_req, res) => {
  /* "rent" before "buy", each in display order */
  const rows = await col.listings().find({published: true}).sort({mode: -1, seq: 1}).toArray();
  res.set('Cache-Control', 'no-cache').json({listings: rows.map(toListing)});
});
publicListings.get('/:id', async (req, res) => {
  const row = await col.listings().findOne({_id: String(req.params.id), published: true});
  if (!row) return res.status(404).json({error: 'This property is no longer available.'});
  res.set('Cache-Control', 'no-cache').json({listing: {...toListing(row), updatedAt: row.updatedAt}});
});

/* ---------- admin ---------- */
export const adminListings = Router();

adminListings.get('/', requirePermission('listings.view'), async (_req, res) => {
  const rows = await col.listings().find().sort({updatedAt: -1, seq: -1}).toArray();
  res.json({listings: rows.map(toAdmin), areas: AREAS, amenities: AMENITIES});
});

adminListings.post('/', requirePermission('listings.edit'), async (req, res) => {
  const {errors, value: v} = validate(req.body ?? {});
  if (errors.length) return res.status(400).json({error: errors.join(' '), errors});
  const now = new Date();
  const doc: Row = {
    _id: '',
    seq: await nextSeq('listings'),
    ...v,
    createdAt: now,
    updatedAt: now,
    updatedBy: req.user!.email
  };
  /* random 8-character id; retried on the rare collision */
  for (let attempt = 0; ; attempt++) {
    doc._id = randomBytes(4).toString('hex').toUpperCase();
    try {
      await col.listings().insertOne(doc);
      break;
    } catch (e) {
      if (!isDuplicateKey(e) || attempt === 4) throw e;
    }
  }
  res.status(201).json({listing: toAdmin(doc)});
});

adminListings.put('/:id', requirePermission('listings.edit'), async (req, res) => {
  const old = await get(String(req.params.id));
  if (!old) return res.status(404).json({error: 'Listing not found.'});
  const {errors, value: v} = validate(req.body ?? {});
  if (errors.length) return res.status(400).json({error: errors.join(' '), errors});
  const row = await col
    .listings()
    .findOneAndUpdate(
      {_id: old._id},
      {$set: {...v, updatedAt: new Date(), updatedBy: req.user!.email}},
      {returnDocument: 'after'}
    );
  if (old.photo !== v.photo) await removePhotos([old]);
  res.json({listing: toAdmin(row!)});
});

adminListings.patch('/:id/published', requirePermission('listings.edit'), async (req, res) => {
  const old = await get(String(req.params.id));
  if (!old) return res.status(404).json({error: 'Listing not found.'});
  const published = !!req.body?.published;
  const row = await col
    .listings()
    .findOneAndUpdate(
      {_id: old._id},
      {$set: {published, updatedAt: new Date(), updatedBy: req.user!.email}},
      {returnDocument: 'after'}
    );
  res.json({listing: toAdmin(row!)});
});

adminListings.delete('/:id', requirePermission('listings.edit'), async (req, res) => {
  const old = await col.listings().findOneAndDelete({_id: String(req.params.id)});
  if (!old) return res.status(404).json({error: 'Listing not found.'});
  await removePhotos([old]);
  res.json({ok: true});
});

/* {ids: [...]} deletes those; {all: true} deletes every listing → {deleted} */
adminListings.post('/delete', requirePermission('listings.edit'), async (req, res) => {
  const {ids, all} = req.body ?? {};
  let filter: {_id?: {$in: string[]}};
  if (all === true) filter = {};
  else if (Array.isArray(ids) && ids.length && ids.length <= 1000 && ids.every(i => typeof i === 'string'))
    filter = {_id: {$in: ids}};
  else return res.status(400).json({error: 'Choose the properties to delete.'});

  const rows = await col
    .listings()
    .find(filter, {projection: {photo: 1}})
    .toArray();
  const {deletedCount} = await col.listings().deleteMany({_id: {$in: rows.map(r => r._id)}});
  await removePhotos(rows);
  res.json({deleted: deletedCount});
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
