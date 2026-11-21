import { useQuery } from '@tanstack/react-query';
import type { SystemMeta } from '@civicresolve/shared';
import { useApiClient } from '../../../lib/apiClient.js';

/**
 * Hook to fetch system metadata including categories, urgencies, and lifecycle transition rules.
 */
export function useMeta() {
  const api = useApiClient();

  return useQuery<SystemMeta, Error>({
    queryKey: ['meta'],
    queryFn: () => api.getMeta(),
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
  });
}
