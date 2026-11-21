import { useQuery } from '@tanstack/react-query';
import type { SystemStats } from '@civicresolve/shared';
import { useApiClient } from '../../../lib/apiClient.js';
import { usePageVisible } from './usePageVisible.js';

/**
 * Hook to fetch high-level system statistics for authority KPI cards.
 * Automatically polls every 30 seconds when tab is active.
 */
export function useStats() {
  const api = useApiClient();
  const isVisible = usePageVisible();

  return useQuery<SystemStats, Error>({
    queryKey: ['stats'],
    queryFn: () => api.getStats(),
    refetchInterval: isVisible ? 30000 : false,
    staleTime: 10000,
  });
}
