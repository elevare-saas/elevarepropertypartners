import {useMemo, useState} from 'react';
import {statusOf, type AdminListing} from '@/types/admin';

export interface ListingFilters {
  query: string;
  mode: 'all' | 'rent' | 'buy';
  status: 'all' | 'live' | 'hidden' | 'draft';
  area: string;
}
const INITIAL: ListingFilters = {query: '', mode: 'all', status: 'all', area: 'all'};

export function matches(l: AdminListing, f: ListingFilters) {
  const q = f.query.trim().toLowerCase();
  return (
    (f.mode === 'all' || l.mode === f.mode) &&
    (f.area === 'all' || l.area === f.area) &&
    (f.status === 'all' || statusOf(l) === f.status) &&
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
    /* each card is also a shortcut: it sets the filters to show exactly those properties */
    const card = (label: string, status: ListingFilters['status'], mode: ListingFilters['mode'] = 'all') => ({
      label,
      status,
      mode,
      value: all.filter(l => (status === 'all' || statusOf(l) === status) && (mode === 'all' || l.mode === mode)).length
    });
    return [
      card('Live for rent', 'live', 'rent'),
      card('Live for sale', 'live', 'buy'),
      card('Drafts', 'draft'),
      card('Hidden', 'hidden'),
      card('Total', 'all')
    ];
  }, [listings]);

  const showOnly = (status: ListingFilters['status'], mode: ListingFilters['mode']) =>
    setFilters({...INITIAL, status, mode});

  return {filters, setFilter, showOnly, shown, stats};
}
