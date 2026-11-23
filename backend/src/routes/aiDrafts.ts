/* Properties → Add with AI: one property per request (photos already uploaded + small copies for the AI, short notes,
   price, area, rent/sale, type) → Claude writes the rest → saved as a draft with the next ELV reference code.
   The dashboard sends several properties one after another. */
import {Router} from 'express';
import {one} from '../db/pg.js';
import {requirePage} from '../middleware/auth.js';
import {log} from '../lib/logger.js';
import {AiError, aiEnabled, writeListing, type AiImage} from '../lib/aiWriter.js';
import {AREAS, insertListing, MAX_PHOTOS, refTaken, toAdmin, TYPES, validate} from './listings.js';
import {isValidPhoto} from '../lib/photoStore.js';

export const MAX_AI_IMAGES = 8;
const MAX_IMAGE_CHARS = 1_500_000; // base64 of a ~1.1 MB image; the dashboard sends ~1024 px JPEGs (~200 KB)
const MAX_NOTES = 2000;

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

aiDrafts.post('/', requirePage('properties'), async (req, res) => {
  if (!aiEnabled())
    return res
      .status(503)
      .json({error: 'AI drafts are not set up yet: the Claude API key (ANTHROPIC_API_KEY) is missing.'});
  const b = req.body ?? {};
  const errors: string[] = [];
  const mode = b.mode,
    type = b.type,
    area = b.area,
    price = Number(b.price);
  const notes = String(b.notes ?? '').trim();
  if (mode !== 'rent' && mode !== 'buy') errors.push('Choose rent or sale.');
  if (!TYPES.includes(type)) errors.push('Choose a property type.');
  if (!AREAS.includes(area)) errors.push('Choose an area.');
  if (!Number.isSafeInteger(price) || price <= 0)
    errors.push(mode === 'buy' ? 'Enter the sale price.' : 'Enter the monthly rent.');
  if (notes.length > MAX_NOTES) errors.push(`Notes: up to ${MAX_NOTES} characters.`);
  const photos = Array.isArray(b.photos) ? [...new Set(b.photos.filter(isValidPhoto))] : [];
  if (!photos.length) errors.push('Add at least one photo.');
  if (photos.length > MAX_PHOTOS) errors.push(`Up to ${MAX_PHOTOS} photos per property.`);
  const images: AiImage[] = (Array.isArray(b.images) ? b.images : [])
    .filter(
      (i: unknown): i is AiImage =>
        !!i &&
        typeof (i as AiImage).data === 'string' &&
        (i as AiImage).data.length <= MAX_IMAGE_CHARS &&
        /^[A-Za-z0-9+/]+=*$/.test((i as AiImage).data) &&
        ['image/jpeg', 'image/png', 'image/webp'].includes((i as AiImage).mediaType)
    )
    .slice(0, MAX_AI_IMAGES);
  if (photos.length && !images.length) errors.push('The photos could not be prepared for the AI. Please try again.');
  if (errors.length) return res.status(400).json({error: errors.join(' '), errors});

  let ai;
  try {
    ai = await writeListing({mode, type, area, price, notes}, images);
  } catch (e) {
    if (e instanceof AiError) return res.status(502).json({error: e.message});
    log.warn(`AI draft failed: ${(e as Error).message}`);
    return res.status(502).json({error: 'The AI service did not answer. Please try again in a minute.'});
  }

  const {errors: invalid, value} = validate({
    mode,
    type,
    area,
    price,
    name: ai.name,
    line: ai.line,
    description: ai.description,
    beds: ai.beds,
    baths: ai.baths,
    sqm: ai.sqm,
    land: ai.land,
    own: ai.own,
    am: ai.am,
    ex: ai.ex,
    photos,
    draft: true
  });
  if (invalid.length)
    return res.status(502).json({error: `The AI draft was incomplete (${invalid.join(' ')}). Please try again.`});

  const meta = {notes, check: ai.check, model: ai.model, generatedAt: new Date().toISOString()};
  /* two people generating at once can pick the same code: take the next one */
  for (let attempt = 0; ; attempt++) {
    try {
      const row = await insertListing({...value, refCode: await nextRef()}, req.user!.email, meta);
      return res.status(201).json({listing: toAdmin(row)});
    } catch (e) {
      if (!refTaken(e) || attempt === 4) throw e;
    }
  }
});
