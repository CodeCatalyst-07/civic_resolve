import React from 'react';
import type { AuthorityTicketView } from '@civicresolve/shared';
import { ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { UrgencyBadge } from '../../../components/UrgencyBadge.js';
import { StatusPill } from '../../../components/StatusPill.js';
import { CategoryChip } from '../../../components/CategoryChip.js';
import { EmptyState } from '../../../components/EmptyState.js';
import { Skeleton } from '../../../components/Skeleton.js';
import { STRINGS } from '../../../content/strings.js';
import { formatTarget } from '../utils/formatters.js';

interface QueueTableProps {
  tickets: readonly AuthorityTicketView[];
  isLoading: boolean;
  isError: boolean;
  selectedTicketId?: string | null;
  onSelectTicket: (id: string) => void;
  onClearFilters: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

export const QueueTable: React.FC<QueueTableProps> = ({
  tickets,
  isLoading,
  isError,
  selectedTicketId,
  onSelectTicket,
  onClearFilters,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}) => {
  if (isLoading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <Skeleton className="h-6 w-48 mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 bg-surface border border-red-200 rounded-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-base font-bold text-ink">Failed to load work queue</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Could not communicate with the municipal dispatch system. Please verify your credentials and try again.
        </p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <EmptyState
        title="No complaints matching criteria"
        description="There are currently no civic grievances matching the selected filters in your jurisdiction."
        action={
          <button
            type="button"
            onClick={onClearFilters}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-700 transition-colors"
          >
            {STRINGS.authority.clearFilters}
          </button>
        }
      />
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-subtle">
      {/* Screen reader live region */}
      <div className="sr-only" aria-live="polite">
        Showing {tickets.length} reports in the authority queue.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <caption className="sr-only">Authority Grievance Work Queue</caption>
          <thead>
            <tr className="border-b border-border bg-slate-50/70 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4">Ticket ID</th>
              <th scope="col" className="py-3 px-4">Urgency</th>
              <th scope="col" className="py-3 px-4">Status</th>
              <th scope="col" className="py-3 px-4">Category</th>
              <th scope="col" className="py-3 px-4">Target SLA</th>
              <th scope="col" className="py-3 px-4">Ward / Area</th>
              <th scope="col" className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-xs text-ink">
            {tickets.map((t) => {
              const isSelected = selectedTicketId === t.id;
              const targetSla = formatTarget(t.due_at);

              return (
                <tr
                  key={t.id}
                  onClick={() => onSelectTicket(t.id)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectTicket(t.id);
                    }
                  }}
                  className={`cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary ${
                    isSelected
                      ? 'bg-blue-50/50 border-l-4 border-l-primary'
                      : 'border-l-4 border-l-transparent'
                  }`}
                  data-testid={`queue-row-${t.id}`}
                >
                  {/* 1. Ticket ID */}
                  <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                    {t.id}
                  </td>

                  {/* 2. Urgency */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <UrgencyBadge urgency={t.urgency} />
                  </td>

                  {/* 3. Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <StatusPill status={t.status} />
                  </td>

                  {/* 4. Category */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <CategoryChip category={t.category} />
                  </td>

                  {/* 5. Target SLA */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tabular-nums ${
                        targetSla.overdue
                          ? 'bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {targetSla.label}
                    </span>
                  </td>

                  {/* 6. Ward / Area */}
                  <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                    {t.ward || t.location?.address || 'Citywide'}
                  </td>

                  {/* 7. Action Arrow */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-400">
                    <ChevronRight className="w-4 h-4 inline-block" aria-hidden="true" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {hasNextPage && (
        <div className="p-4 border-t border-border bg-slate-50/50 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold rounded-lg bg-surface border border-slate-500 text-ink hover:bg-page transition-colors shadow-sm disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Loading reports...</span>
              </>
            ) : (
              <span>{STRINGS.authority.loadMore}</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
