import { useInfiniteQuery } from '@tanstack/react-query';
import type { AuthorityTicketView } from '@civicresolve/shared';
import { useApiClient } from '../../../lib/apiClient.js';
import { usePageVisible } from './usePageVisible.js';
import type { QueueFilters } from '../types.js';

interface QueuePageData {
  tickets: readonly AuthorityTicketView[];
  next_cursor?: string;
}

/**
 * Hook to fetch authority grievance work queue with infinite cursor-based pagination.
 * Automatically polls every 30 seconds when active tab is visible.
 */
export function useQueue(filters: QueueFilters) {
  const api = useApiClient();
  const isVisible = usePageVisible();

  const query = useInfiniteQuery<QueuePageData, Error>({
    queryKey: ['authority', 'queue', filters],
    queryFn: ({ pageParam }) =>
      api.getAuthorityQueue({
        ...filters,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
    refetchInterval: isVisible ? 30000 : false,
    staleTime: 10000,
  });

  const tickets = query.data?.pages.flatMap((page) => page.tickets) ?? [];

  return {
    ...query,
    tickets,
  };
}
