import React from 'react';
import { AlertCircle, Clock, CheckCircle2, Inbox } from 'lucide-react';
import { Status, Urgency, type SystemStats } from '@civicresolve/shared';
import { STRINGS } from '../../../content/strings.js';
import type { QueueFilters } from '../types.js';

interface KpiTilesProps {
  stats?: SystemStats;
  isLoading: boolean;
  filters: QueueFilters;
  onFilterChange: (filters: QueueFilters) => void;
}

export const KpiTiles: React.FC<KpiTilesProps> = ({
  stats,
  isLoading,
  filters,
  onFilterChange,
}) => {
  const isCriticalActive = filters.urgency === Urgency.CRITICAL;
  const isOverdueActive = filters.overdue === true;
  const isResolvedActive = filters.status === Status.RESOLVED;
  const isOpenActive = !isCriticalActive && !isOverdueActive && !isResolvedActive && !filters.status;

  const toggleCritical = () => {
    if (isCriticalActive) {
      onFilterChange({ ...filters, urgency: undefined, cursor: undefined });
    } else {
      onFilterChange({ ...filters, urgency: Urgency.CRITICAL, cursor: undefined });
    }
  };

  const toggleOverdue = () => {
    if (isOverdueActive) {
      onFilterChange({ ...filters, overdue: undefined, cursor: undefined });
    } else {
      onFilterChange({ ...filters, overdue: true, cursor: undefined });
    }
  };

  const toggleResolved = () => {
    if (isResolvedActive) {
      onFilterChange({ ...filters, status: undefined, cursor: undefined });
    } else {
      onFilterChange({ ...filters, status: Status.RESOLVED, cursor: undefined });
    }
  };

  const showOpenAll = () => {
    onFilterChange({
      ...filters,
      status: undefined,
      urgency: undefined,
      overdue: undefined,
      cursor: undefined,
    });
  };

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-surface rounded-xl border border-border animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      role="region"
      aria-label="Operational Metrics and Quick Filters"
    >
      {/* 1. Open Reports */}
      <button
        type="button"
        onClick={showOpenAll}
        aria-pressed={isOpenActive}
        className={`p-4 rounded-xl border text-left transition-all focus-visible:outline-2 focus-visible:outline-primary ${
          isOpenActive
            ? 'bg-blue-50/50 border-primary ring-1 ring-primary shadow-sm'
            : 'bg-surface border-border hover:border-slate-400'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>{STRINGS.authority.kpiOpen}</span>
          <Inbox className="w-4 h-4 text-slate-500" aria-hidden="true" />
        </div>
        <div className="mt-2 text-2xl font-bold text-ink tabular-nums">
          {stats.open}
        </div>
      </button>

      {/* 2. Critical Open (with red accent bar) */}
      <button
        type="button"
        onClick={toggleCritical}
        aria-pressed={isCriticalActive}
        className={`p-4 rounded-xl border border-l-4 border-l-[#B91C1C] text-left transition-all focus-visible:outline-2 focus-visible:outline-primary ${
          isCriticalActive
            ? 'bg-red-50/50 border-red-500 ring-1 ring-red-500 shadow-sm'
            : 'bg-surface border-border hover:border-slate-400'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>{STRINGS.authority.kpiCritical}</span>
          <AlertCircle className="w-4 h-4 text-urgency-critical" aria-hidden="true" />
        </div>
        <div className="mt-2 text-2xl font-bold text-urgency-critical tabular-nums">
          {stats.critical_open}
        </div>
      </button>

      {/* 3. Overdue (with orange accent bar) */}
      <button
        type="button"
        onClick={toggleOverdue}
        aria-pressed={isOverdueActive}
        className={`p-4 rounded-xl border border-l-4 border-l-[#C2410C] text-left transition-all focus-visible:outline-2 focus-visible:outline-primary ${
          isOverdueActive
            ? 'bg-orange-50/50 border-orange-500 ring-1 ring-orange-500 shadow-sm'
            : 'bg-surface border-border hover:border-slate-400'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>{STRINGS.authority.kpiOverdue}</span>
          <Clock className="w-4 h-4 text-urgency-high" aria-hidden="true" />
        </div>
        <div className="mt-2 text-2xl font-bold text-urgency-high tabular-nums">
          {stats.overdue}
        </div>
      </button>

      {/* 4. Resolved in last 7 days */}
      <button
        type="button"
        onClick={toggleResolved}
        aria-pressed={isResolvedActive}
        className={`p-4 rounded-xl border text-left transition-all focus-visible:outline-2 focus-visible:outline-primary ${
          isResolvedActive
            ? 'bg-green-50/50 border-green-600 ring-1 ring-green-600 shadow-sm'
            : 'bg-surface border-border hover:border-slate-400'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>{STRINGS.authority.kpiResolved7Days}</span>
          <CheckCircle2 className="w-4 h-4 text-status-resolved" aria-hidden="true" />
        </div>
        <div className="mt-2 text-2xl font-bold text-ink tabular-nums">
          {stats.resolved_last_7_days}
        </div>
      </button>
    </div>
  );
};
