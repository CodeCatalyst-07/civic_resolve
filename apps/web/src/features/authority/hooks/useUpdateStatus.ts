import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthorityTicketView, StatusUpdateInput } from '@civicresolve/shared';
import { useApiClient } from '../../../lib/apiClient.js';

interface UpdateStatusVariables {
  id: string;
  input: StatusUpdateInput;
}

/**
 * Hook to update a ticket's operational lifecycle status.
 * Automatically invalidates active queue, ticket, and system stat queries.
 */
export function useUpdateStatus() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<AuthorityTicketView, Error, UpdateStatusVariables>({
    mutationFn: ({ id, input }) => api.updateAuthorityStatus(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['authority', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['authority', 'ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
