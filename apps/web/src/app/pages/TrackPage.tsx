import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isValidTicketId } from '@civicresolve/shared';
import { getApiClient } from '../../lib/apiClient.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { STRINGS } from '../../content/strings.js';
import { TrackView } from '../../features/citizen/components/TrackView.js';
import { Skeleton } from '../../components/Skeleton.js';
import { ErrorState } from '../../components/ErrorState.js';
import { Search, AlertCircle } from 'lucide-react';

export function TrackPage(): React.JSX.Element {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const formattedId = id?.trim().toUpperCase();
  usePageTitle(formattedId ? `Track ${formattedId}` : 'Track Grievance');

  const [inputVal, setInputVal] = useState(formattedId || '');
  const [formError, setFormError] = useState<string | null>(null);

  const isValidId = formattedId ? isValidTicketId(formattedId) : false;

  const {
    data: ticket,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ticket', formattedId],
    queryFn: () => getApiClient().getTicket(formattedId!),
    enabled: !!formattedId && isValidId,
  });

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputVal.trim().toUpperCase();

    if (!cleaned) {
      setFormError('Please enter a ticket code');
      return;
    }

    if (!isValidTicketId(cleaned)) {
      setFormError('Please enter a valid 8-character code like CR-7X2K9M4P');
      return;
    }

    setFormError(null);
    navigate(`/track/${cleaned}`);
  };

  const handleSupportTicket = async () => {
    if (!formattedId) return;
    const updated = await getApiClient().supportTicket(formattedId);
    queryClient.setQueryData(['ticket', formattedId], updated);
  };

  const handleReopenTicket = async (note: string) => {
    if (!formattedId) return;
    const updated = await getApiClient().reopenTicket(formattedId, note);
    queryClient.setQueryData(['ticket', formattedId], updated);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8" data-testid="track-page">
      {/* Page Header */}
      <div className="space-y-1 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          {STRINGS.track.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {STRINGS.track.pageSubtitle}
        </p>
      </div>

      {/* Lookup Bar */}
      <div className="p-4 bg-surface border border-border rounded-xl shadow-subtle">
        <form onSubmit={handleLookupSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value.toUpperCase());
                if (formError) setFormError(null);
              }}
              placeholder={STRINGS.track.lookupPlaceholder}
              maxLength={11}
              className="w-full px-3 py-2 text-sm font-mono uppercase bg-page border border-slate-500 rounded-lg text-ink placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-primary"
              aria-invalid={!!formError}
              aria-describedby={formError ? 'track-lookup-error' : undefined}
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Search className="w-4 h-4" aria-hidden="true" />
            <span>{STRINGS.track.lookupButton}</span>
          </button>
        </form>

        {formError && (
          <p id="track-lookup-error" role="alert" className="text-xs font-medium text-red-700 flex items-center gap-1.5 mt-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </p>
        )}
      </div>

      {/* Ticket Details View */}
      {formattedId ? (
        !isValidId ? (
          <ErrorState
            title="Invalid Ticket Reference"
            message={`"${formattedId}" is not a valid 8-character Crockford Base32 tracking code (e.g. CR-7X2K9M4P).`}
          />
        ) : isLoading ? (
          <div className="p-6 bg-surface border border-border rounded-xl space-y-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : isError ? (
          <ErrorState
            title="Ticket Not Found"
            message={
              (error as { status?: number })?.status === 404
                ? `No grievance registered with ID "${formattedId}". Please verify your 8-character code.`
                : (error as Error)?.message || STRINGS.errors.genericMessage
            }
            onRetry={() => refetch()}
          />
        ) : ticket ? (
          <TrackView
            ticket={ticket}
            onSupport={handleSupportTicket}
            onReopen={handleReopenTicket}
          />
        ) : null
      ) : (
        <div className="py-12 text-center text-xs text-slate-500">
          Enter an 8-character ticket reference code above to inspect live municipal status.
        </div>
      )}
    </div>
  );
}
