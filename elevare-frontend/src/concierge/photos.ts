/* Property photos come only from the database (each listing's `photo`): uploaded (/uploads/…) or a bundled
   /photos/… file. photos.json holds the Wikimedia Commons credits for the bundled files, which their licences require. */
import data from './photos.json';
import type {Listing} from './data';
import {assetUrl} from '@/services/apiBase';

export interface Photo {
  src: string;
  w: number;
  h: number;
  caption: string;
  title: string;
  author: string;
  license: string;
  page: string;
}
const CREDITS = Object.values(data as Record<string, Photo>);

export type Img = Pick<Photo, 'src' | 'w' | 'h'>;

/* the listing's own photo, or null (callers show a neutral placeholder, never a stock image) */
export const listingPhoto = (p: Pick<Listing, 'photo'>): Img | null => {
  if (!p.photo) return null;
  const known = CREDITS.find(c => c.src === p.photo);
  return {src: assetUrl(p.photo), w: known?.w ?? 1200, h: known?.h ?? 800};
};

/* up to n distinct listing photos in random order (new order on every page load) */
export function randomPhotos(listings: Pick<Listing, 'photo'>[], n: number): Img[] {
  const seen = new Set<string>();
  const out: Img[] = [];
  for (const l of [...listings].sort(() => Math.random() - 0.5)) {
    const ph = listingPhoto(l);
    if (ph && !seen.has(ph.src)) {
      seen.add(ph.src);
      out.push(ph);
    }
    if (out.length === n) break;
  }
  return out;
}
