/* Listing photos: Vercel Blob when BLOB_READ_WRITE_TOKEN is set (serverless hosting, whose disk is temporary),
   otherwise the UPLOAD_DIR folder served at /uploads/ (a normal server). */
import {del, put} from '@vercel/blob';
import {randomBytes} from 'node:crypto';
import {mkdir, unlink, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {env} from '../config/env.js';
import {log} from './logger.js';

const BLOB_URL = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[\w./-]+$/;
const LOCAL_URL = /^\/uploads\/[\w.-]+$/;

/* a photo this app stored (and may delete) */
export const isStoredPhoto = (url: string | null | undefined): url is string =>
  !!url && (LOCAL_URL.test(url) || BLOB_URL.test(url));
/* what a listing's `photo` may be: a stored upload or a bundled /photos/ file */
export const isValidPhoto = (url: unknown): url is string =>
  typeof url === 'string' && (isStoredPhoto(url) || /^\/photos\/[\w.-]+$/.test(url));

/* on serverless hosting without Blob there is nowhere lasting to keep files */
export const canStorePhotos = () => !!env.blobToken || !process.env.VERCEL;

export async function savePhoto(data: Buffer, ext: string, contentType: string): Promise<string> {
  const name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
  if (env.blobToken) {
    const blob = await put(`listings/${name}`, data, {
      access: 'public',
      contentType,
      token: env.blobToken,
      cacheControlMaxAge: 31536000
    });
    return blob.url;
  }
  await mkdir(env.limits.uploadDir, {recursive: true});
  await writeFile(join(env.limits.uploadDir, name), data);
  return '/uploads/' + name;
}

export async function deletePhoto(url: string | null | undefined) {
  if (!isStoredPhoto(url)) return;
  try {
    if (BLOB_URL.test(url)) await del(url, {token: env.blobToken});
    else await unlink(join(env.limits.uploadDir, url.slice('/uploads/'.length)));
  } catch (e) {
    log.debug(`Photo not deleted (${url}): ${(e as Error).message}`);
  }
}
