import {useMemo, useState} from 'react';
import type {AdminListing} from '@/types/admin';

export interface ListingFilters {
  query: string;
  mode: 'all' | 'rent' | 'buy';
  status: 'all' | 'live' | 'hidden';
  area: string;
}
const INITIAL: ListingFilters = {query: '', mode: 'all', status: 'all', area: 'all'};

export function matches(l: AdminListing, f: ListingFilters) {
  const q = f.query.trim().toLowerCase();
  return (
    (f.mode === 'all' || l.mode === f.mode) &&
    (f.area === 'all' || l.area === f.area) &&
    (f.status === 'all' || (f.status === 'live') === l.published) &&
    (!q || `${l.name} ${l.id} ${l.refCode ?? ''} ${l.area} ${l.line}`.toLowerCase().includes(q))
  );
}

export function useListingFilters(listings: AdminListing[] | undefined) {
  const [filters, setFilters] = useState<ListingFilters>(INITIAL);
  const setFilter = <K extends keyof ListingFilters>(key: K, value: ListingFilters[K]) =>
    setFilters(f => ({...f, [key]: value}));

  const shown = useMemo(() => (listings ?? []).filter(l => matches(l, filters)), [listings, filters]);

  const stats = useMemo(() => {
    const all = listings ?? [];
    return [
      {label: 'Live for rent', value: all.filter(l => l.published && l.mode === 'rent').length},
      {label: 'Live for sale', value: all.filter(l => l.published && l.mode === 'buy').length},
      {label: 'Hidden', value: all.filter(l => !l.published).length},
      {label: 'Total', value: all.length}
    ];
  }, [listings]);

  return {filters, setFilter, shown, stats};
}
