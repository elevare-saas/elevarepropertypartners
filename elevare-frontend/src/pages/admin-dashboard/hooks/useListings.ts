import {useCallback, useState} from 'react';
import {useQuery} from '@/hooks/useQuery';
import {useToast} from '@/hooks/useToast';
import {errorMessage} from '@/lib/http';
import {listingsApi} from '@/services/listingsApi';
import type {AdminListing, ListingStatus} from '@/types/admin';

const STATUS_DONE: Record<ListingStatus, string> = {
  live: 'now live on the website',
  draft: 'moved to drafts (off the website)',
  hidden: 'hidden from the website'
};

export function useListings() {
  const toast = useToast();
  const {data: listings, error, loading, reload, setData} = useQuery('admin-listings', listingsApi.list);
  /* listing with an action in flight (its buttons are disabled) */
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  /* insert or replace a listing (new ones first) */
  const upsert = useCallback(
    (listing: AdminListing) =>
      setData(rows => {
        const list = rows ?? [];
        return list.some(r => r.id === listing.id)
          ? list.map(r => (r.id === listing.id ? listing : r))
          : [listing, ...list];
      }),
    [setData]
  );

  const setStatus = useCallback(
    async (listing: AdminListing, status: ListingStatus) => {
      setPendingId(listing.id);
      try {
        upsert(await listingsApi.setStatus(listing.id, status));
        toast.success(`“${listing.name}” ${STATUS_DONE[status]}.`);
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setPendingId(null);
      }
    },
    [upsert, toast]
  );

  /* resolves true on success */
  const setStatusMany = useCallback(
    async (ids: string[], status: ListingStatus) => {
      setBulkPending(true);
      try {
        const saved = await listingsApi.setStatusMany(ids, status);
        setData(rows => rows?.map(r => saved.find(s => s.id === r.id) ?? r));
        toast.success(`${saved.length} ${saved.length === 1 ? 'property' : 'properties'} ${STATUS_DONE[status]}.`);
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        reload();
        return false;
      } finally {
        setBulkPending(false);
      }
    },
    [setData, reload, toast]
  );

  const remove = useCallback(
    async (listing: AdminListing) => {
      setPendingId(listing.id);
      try {
        await listingsApi.remove(listing.id);
        setData(rows => rows?.filter(r => r.id !== listing.id));
        toast.success(`“${listing.name}” was deleted.`);
      } catch (e) {
        toast.error(errorMessage(e));
      } finally {
        setPendingId(null);
      }
    },
    [setData, toast]
  );

  /* ids, or 'all'; resolves true on success */
  const removeMany = useCallback(
    async (ids: string[] | 'all') => {
      setBulkPending(true);
      try {
        const deleted = ids === 'all' ? await listingsApi.removeAll() : await listingsApi.removeMany(ids);
        if (ids === 'all') setData([]);
        else setData(rows => rows?.filter(r => !ids.includes(r.id)));
        toast.success(`${deleted} ${deleted === 1 ? 'property was' : 'properties were'} deleted.`);
        return true;
      } catch (e) {
        toast.error(errorMessage(e));
        reload();
        return false;
      } finally {
        setBulkPending(false);
      }
    },
    [setData, reload, toast]
  );

  return {
    listings,
    error,
    loading,
    reload,
    pendingId,
    bulkPending,
    upsert,
    setStatus,
    setStatusMany,
    remove,
    removeMany
  };
}
