/* load before the home modules import: they derive figures from LISTINGS on load.
   only published listings from the API are shown; if it is unreachable, LISTINGS stays empty
   and listingsStatus is 'unavailable', so the page says so instead of showing homes */
import {LISTINGS, listingsStatus, setListingsStatus, type Listing} from '@/concierge/data';
import {apiUrl} from '@/services/apiBase';

export {listingsStatus};

const pos = (v: unknown) => typeof v === 'number' && v > 0;
const isListing = (l: unknown): l is Listing => {
  const x = l as Partial<Listing> | null;
  return (
    !!x &&
    typeof x.id === 'string' &&
    (x.mode === 'rent' || x.mode === 'buy') &&
    typeof x.name === 'string' &&
    typeof x.area === 'string' &&
    (x.type === 'villa' || x.type === 'condo' || x.type === 'townhouse') &&
    typeof x.beds === 'number' &&
    pos(x.price) &&
    /* floor area, land area, ownership and estimated rent are optional (the site hides what's missing) */
    (x.sqm === undefined || pos(x.sqm)) &&
    (x.land === undefined || pos(x.land)) &&
    (x.baths === undefined || pos(x.baths)) &&
    (x.own === undefined || typeof x.own === 'string') &&
    (x.rent === undefined || pos(x.rent)) &&
    Array.isArray(x.am) &&
    Array.isArray(x.ex)
  );
};

export async function loadListings() {
  try {
    const r = await fetch(apiUrl('/api/listings'), {signal: AbortSignal.timeout(4000)});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const {listings} = (await r.json()) as {listings?: unknown};
    if (!Array.isArray(listings)) throw new Error('unexpected response');
    LISTINGS.splice(0, LISTINGS.length, ...listings.filter(isListing));
    setListingsStatus('ok');
  } catch (e) {
    LISTINGS.length = 0;
    setListingsStatus('unavailable');
    console.warn('Could not load /api/listings; showing no homes.', e);
  }
}
