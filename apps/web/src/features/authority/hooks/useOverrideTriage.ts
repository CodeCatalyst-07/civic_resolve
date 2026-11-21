import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthorityTicketView, OverrideInput } from '@civicresolve/shared';
import { useApiClient } from '../../../lib/apiClient.js';

interface OverrideTriageVariables {
  id: string;
  input: OverrideInput;
}

/**
 * Hook to manually override urgency, category, or department for a ticket.
 * Automatically invalidates active queue, ticket, and system stat queries.
 */
export function useOverrideTriage() {
  const api = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<AuthorityTicketView, Error, OverrideTriageVariables>({
    mutationFn: ({ id, input }) => api.overrideAuthorityTriage(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['authority', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['authority', 'ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
