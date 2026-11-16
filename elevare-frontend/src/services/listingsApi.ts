import {request} from '@/lib/http';
import type {AdminListing, ListingInput} from '@/types/admin';

const base = '/admin/listings';
const one = (r: {listing: AdminListing}) => r.listing;
const path = (id: string) => `${base}/${encodeURIComponent(id)}`;

export const listingsApi = {
  list: (signal?: AbortSignal) => request<{listings: AdminListing[]}>(base, {signal}).then(r => r.listings),
  create: (input: ListingInput) => request<{listing: AdminListing}>(base, {body: input}).then(one),
  update: (id: string, input: ListingInput) =>
    request<{listing: AdminListing}>(path(id), {method: 'PUT', body: input}).then(one),
  setPublished: (id: string, published: boolean) =>
    request<{listing: AdminListing}>(`${path(id)}/published`, {method: 'PATCH', body: {published}}).then(one),
  remove: (id: string) => request<{ok: true}>(path(id), {method: 'DELETE'}),
  removeMany: (ids: string[]) => request<{deleted: number}>(`${base}/delete`, {body: {ids}}).then(r => r.deleted),
  removeAll: () => request<{deleted: number}>(`${base}/delete`, {body: {all: true}}).then(r => r.deleted),

  /* JPG/PNG/WebP, shrunk first; answers the URL for the listing's `photo` */
  uploadPhoto: async (file: File) => {
    const form = new FormData();
    form.append('photo', await shrink(file));
    return request<{url: string}>(`${base}/photo`, {form}).then(r => r.url);
  }
};

/* at most 2000 px wide, WebP: small uploads (the host caps requests at ~4.5 MB) and fast pages.
   Falls back to the original file if the browser can't decode or encode it. */
async function shrink(file: File, max = 2000): Promise<File> {
  try {
    const img = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = Object.assign(document.createElement('canvas'), {
      width: Math.round(img.width * scale),
      height: Math.round(img.height * scale)
    });
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    img.close();
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', 0.85));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', {type: 'image/webp'});
  } catch {
    return file;
  }
}
