import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { STRINGS } from '../../../content/strings.js';
import { AuthorityNav } from '../components/AuthorityNav.js';
import { KpiTiles } from '../components/KpiTiles.js';
import { FilterBar } from '../components/FilterBar.js';
import { QueueTable } from '../components/QueueTable.js';
import { TicketDetailSheet } from '../components/TicketDetailSheet.js';
import { useStats, useQueue } from '../hooks/index.js';
import { toSearchParams, fromSearchParams } from '../utils/filters.js';
import type { QueueFilters } from '../types.js';

export const AuthorityQueuePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL
  const filters: QueueFilters = useMemo(() => {
    return fromSearchParams(searchParams);
  }, [searchParams]);

  // Selected ticket for side sheet
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useStats();
  const {
    tickets,
    isLoading: queueLoading,
    isError: queueError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch: refetchQueue,
    isRefetching,
  } = useQueue(filters);

  const handleFilterChange = (newFilters: QueueFilters) => {
    const params = toSearchParams(newFilters);
    setSearchParams(params, { replace: true });
  };

  const handleSelectTicket = (id: string) => {
    setSelectedTicketId(id);
    setSheetOpen(true);
  };

  const handleManualRefresh = () => {
    refetchStats();
    refetchQueue();
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            {STRINGS.authority.title}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Real-time municipal grievance triage, SLA tracking, and field crew dispatch.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 text-xs font-semibold rounded-lg border border-slate-500 bg-surface text-ink hover:bg-page transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-slate-500 ${isRefetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{STRINGS.authority.refreshQueue}</span>
        </button>
      </div>

      {/* Sub Navigation */}
      <AuthorityNav />

      {/* KPI Tiles */}
      <KpiTiles
        stats={stats}
        isLoading={statsLoading}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Queue Table */}
      <QueueTable
        tickets={tickets}
        isLoading={queueLoading}
        isError={queueError}
        selectedTicketId={selectedTicketId}
        onSelectTicket={handleSelectTicket}
        onClearFilters={() => handleFilterChange({})}
        hasNextPage={Boolean(hasNextPage)}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      {/* Detail Slide-over Panel */}
      <TicketDetailSheet
        ticketId={selectedTicketId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
};
