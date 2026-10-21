/* Real photos from Wikimedia Commons (credits in photos.json, shown in the footer).
   Area photos show the place itself; listing photos are illustrative, since the listings are samples. */
import data from './photos.json';
import type {Listing} from './data';

export interface Photo { src: string; w: number; h: number; caption: string; title: string; author: string; license: string; page: string }
export const PHOTOS = data as Record<string, Photo>;
export const photo = (slug: string) => PHOTOS[slug];

const slugOf = (s: string) => s.toLowerCase().replace(/\s+/g, '-');
export const areaPhoto = (area: string) => PHOTOS['area-' + slugOf(area)] || PHOTOS.hero;

const LISTING: Record<string, string> = {
  RWS: 'interior-condo', KTC: 'condo-tower', CHL: 'interior-bed', PTE: 'interior-living', NHV: 'villa-garden', SAL: 'villa-palms',
  KRD: 'villa-sea', LGH: 'villa-hills', BTT: 'town-terrace', KMC: 'interior-daybed', KMV: 'villa-loungers', SRP: 'life-bang-tao',
  CYP: 'villa-bay', AMY: 'villa-loungers', BTL: 'villa-garden', RGV: 'villa-palms', KSC: 'condo-tower', SBC: 'interior-daybed', NHT2: 'town-house'
};
const BY_TYPE = {villa: 'villa-bay', condo: 'condo-tower', townhouse: 'town-house'};
export const listingPhoto = (p: Listing) => PHOTOS[LISTING[p.id] || BY_TYPE[p.type]];
