import { useQuery } from '@tanstack/react-query';
import type { AuthorityTicketView } from '@civicresolve/shared';
import { useApiClient } from '../../../lib/apiClient.js';

/**
 * Hook to fetch deep authority investigation details for a specific ticket.
 */
export function useAuthorityTicket(id?: string | null) {
  const api = useApiClient();

  return useQuery<AuthorityTicketView, Error>({
    queryKey: ['authority', 'ticket', id],
    queryFn: () => {
      if (!id) throw new Error('Ticket ID is required');
      return api.getAuthorityTicket(id);
    },
    enabled: Boolean(id),
    staleTime: 10000,
  });
}
