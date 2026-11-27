import {request} from '@/lib/http';
import type {SiteSettings} from '@/lib/siteSettings';

/* an area as the dashboard edits it: `id` keeps a renamed area tied to its properties */
export type AdminArea = SiteSettings['areas'][number] & {id?: string};
export interface AdminSettings extends Omit<SiteSettings, 'areas'> {
  areas: AdminArea[];
  /* properties per area name */
  areaUse: Record<string, number>;
  updated: Record<string, {updatedAt: string; updatedBy: string | null}>;
}

const base = '/admin/settings';
export const settingsApi = {
  get: (signal?: AbortSignal) => request<AdminSettings>(base, {signal}),
  saveAreas: (value: AdminArea[]) =>
    request<{value: AdminArea[]; renamed: {from: string; to: string}[]; areaUse: Record<string, number>}>(
      `${base}/areas`,
      {method: 'PUT', body: {value}}
    ),
  saveMarket: (value: SiteSettings['market']) =>
    request<{value: SiteSettings['market']}>(`${base}/market`, {method: 'PUT', body: {value}}),
  saveContact: (value: SiteSettings['contact']) =>
    request<{value: SiteSettings['contact']}>(`${base}/contact`, {method: 'PUT', body: {value}})
};
