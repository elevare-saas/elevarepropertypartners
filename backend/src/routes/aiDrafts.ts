/* Properties → Add with AI: one property per request (photos already uploaded, short notes, price, area, rent/sale,
   type, and optionally the reference code) → Claude writes the rest → saved as a draft.
   The request carries only the photo addresses: the server loads the photos for the AI itself, because the host caps
   a request at ~4.4 MB and eight photos easily pass that. The dashboard sends several properties one after another. */
import {Router} from 'express';
import {one} from '../db/pg.js';
import {requirePage} from '../middleware/auth.js';
import {log} from '../lib/logger.js';
import {AiError, aiEnabled, writeListing, type AiImage} from '../lib/aiWriter.js';
import {AREAS, insertListing, MAX_PHOTOS, refTaken, toAdmin, TYPES, validate} from './listings.js';
import {isValidPhoto, readPhoto} from '../lib/photoStore.js';

export const MAX_AI_IMAGES = 8;
/* Claude accepts images up to 5 MB each (base64 adds a third): a bigger photo is left out, the others still go */
const MAX_IMAGE_BYTES = 3_700_000;
const MAX_NOTES = 5000;
const REF_CODE = /^[A-Z0-9][A-Z0-9._-]{0,29}$/;

export const aiDrafts = Router();

aiDrafts.get('/status', requirePage('properties'), (_req, res) => {
  res.json({enabled: aiEnabled(), maxImages: MAX_AI_IMAGES, maxPhotos: MAX_PHOTOS});
});

const nextRef = async () =>
  `ELV-${String(
    (
      await one<{n: number}>(
        `select coalesce(max(substring(upper(ref_code) from '^ELV-(\\d+)$')::int), 0) + 1 as n from listings`
      )
    )?.n ?? 1
  ).padStart(3, '0')}`;

const refOwner = (code: string) =>
  one<{name: string}>('select name from listings where upper(ref_code) = upper($1)', [code]);
const takenMessage = (code: string, name?: string) =>
  `Reference code ${code} is already used${name ? ` by “${name}”` : ''}. Change it, or leave it empty for the next ELV code.`;

aiDrafts.post('/', requirePage('properties'), async (req, res) => {
  if (!aiEnabled())
    return res
      .status(503)
      .json({error: 'AI drafts are not set up yet: the Claude API key (ANTHROPIC_API_KEY) is missing.'});
  const b = req.body ?? {};
  const errors: string[] = [];
  /* rent/sale, type, area and price are optional: left out, the AI reads them from the notes */
  const given = (v: unknown) => v !== undefined && v !== null && v !== '';
  const mode = given(b.mode) ? b.mode : undefined,
    type = given(b.type) ? b.type : undefined,
    area = given(b.area) ? b.area : undefined,
    price = given(b.price) ? Number(b.price) : undefined;
  const notes = String(b.notes ?? '').trim();
  const refCode = String(b.refCode ?? '')
    .trim()
    .toUpperCase();
  if (mode !== undefined && mode !== 'rent' && mode !== 'buy') errors.push('Choose rent or sale.');
  if (type !== undefined && !TYPES.includes(type)) errors.push('Choose a property type.');
  if (area !== undefined && !AREAS.includes(area)) errors.push('Choose an area.');
  if (price !== undefined && (!Number.isSafeInteger(price) || price <= 0)) errors.push('Price: a whole number of THB.');
  if (!notes && !(mode && type && area && price))
    errors.push('Write the notes, or fill in rent/sale, type, area and price.');
  if (notes.length > MAX_NOTES) errors.push(`Notes: up to ${MAX_NOTES} characters.`);
  if (refCode && !REF_CODE.test(refCode))
    errors.push('Reference code: letters, numbers, dots or dashes only (up to 30), e.g. ELV-084.');
  const photos: string[] = Array.isArray(b.photos) ? [...new Set<string>(b.photos.filter(isValidPhoto))] : [];
  if (!photos.length) errors.push('Add at least one photo.');
  if (photos.length > MAX_PHOTOS) errors.push(`Up to ${MAX_PHOTOS} photos per property.`);
  if (errors.length) return res.status(400).json({error: errors.join(' '), errors});

  /* a code that's already used is caught before paying for the AI */
  if (refCode) {
    const owner = await refOwner(refCode);
    if (owner) return res.status(409).json({error: takenMessage(refCode, owner.name)});
  }

  const images: AiImage[] = (await Promise.all(photos.slice(0, MAX_AI_IMAGES).map(readPhoto)))
    .filter(p => !!p && p.data.length <= MAX_IMAGE_BYTES)
    .map(p => ({mediaType: p!.mediaType, data: p!.data.toString('base64')}));
  if (!images.length)
    return res.status(400).json({error: 'The photos could not be loaded for the AI. Please try again.'});

  let ai;
  try {
    ai = await writeListing({mode, type, area, price, notes}, images);
  } catch (e) {
    if (e instanceof AiError) return res.status(e.status).json({error: e.message});
    log.warn(`AI draft failed: ${(e as Error).message}`);
    return res.status(502).json({error: 'The AI service did not answer. Please try again in a minute.'});
  }

  const {errors: invalid, value} = validate({
    mode: ai.mode,
    type: ai.type,
    area: ai.area,
    price: ai.price,
    name: ai.name,
    line: ai.line,
    description: ai.description,
    beds: ai.beds,
    baths: ai.baths,
    sqm: ai.sqm,
    living: ai.living,
    land: ai.land,
    own: ai.own,
    am: ai.am,
    ex: ai.ex,
    photos,
    status: 'draft'
  });
  if (invalid.length)
    return res.status(502).json({error: `The AI draft was incomplete (${invalid.join(' ')}). Please try again.`});

  const meta = {notes, check: ai.check, model: ai.model, generatedAt: new Date().toISOString()};
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await insertListing({...value, refCode: refCode || (await nextRef())}, req.user!.email, meta);
      return res.status(201).json({listing: toAdmin(row)});
    } catch (e) {
      if (!refTaken(e)) throw e;
      /* someone took the given code meanwhile; an automatic code just moves on to the next one */
      if (refCode) return res.status(409).json({error: takenMessage(refCode)});
      if (attempt === 4) throw e;
    }
  }
});
