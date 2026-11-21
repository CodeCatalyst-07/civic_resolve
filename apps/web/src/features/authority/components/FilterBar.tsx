import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Status,
  Category,
  Urgency,
  STATUSES,
  CATEGORIES,
  URGENCIES,
} from '@civicresolve/shared';
import { X, Filter } from 'lucide-react';
import { useApiClient } from '../../../lib/apiClient.js';
import { STRINGS } from '../../../content/strings.js';
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  URGENCY_LABELS,
} from '../../../content/labels.js';
import type { QueueFilters } from '../types.js';

interface FilterBarProps {
  filters: QueueFilters;
  onFilterChange: (filters: QueueFilters) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
}) => {
  const api = useApiClient();

  const { data: wards = [] } = useQuery({
    queryKey: ['wards'],
    queryFn: () => api.getWards(),
    staleTime: 60 * 60 * 1000,
  });

  const hasActiveFilters = Boolean(
    filters.status ||
      filters.category ||
      filters.urgency ||
      filters.ward ||
      filters.overdue
  );

  const handleClear = () => {
    onFilterChange({});
  };

  return (
    <div
      className="p-4 bg-surface rounded-xl border border-border mb-6 space-y-4"
      role="search"
      aria-label="Queue Filter Controls"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Filter className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-500 text-ink hover:bg-page transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{STRINGS.authority.clearFilters}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* 1. Status Filter */}
        <div className="space-y-1">
          <label
            htmlFor="filter-status"
            className="block text-xs font-semibold text-slate-700"
          >
            {STRINGS.authority.filterStatus}
          </label>
          <select
            id="filter-status"
            value={filters.status ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: (e.target.value as Status) || undefined,
                cursor: undefined,
              })
            }
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-500 bg-white text-ink focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">{STRINGS.authority.allStatuses}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]?.label ?? s}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Category Filter */}
        <div className="space-y-1">
          <label
            htmlFor="filter-category"
            className="block text-xs font-semibold text-slate-700"
          >
            {STRINGS.authority.filterCategory}
          </label>
          <select
            id="filter-category"
            value={filters.category ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                category: (e.target.value as Category) || undefined,
                cursor: undefined,
              })
            }
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-500 bg-white text-ink focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">{STRINGS.authority.allCategories}</option>
            {CATEGORIES.filter((c) => c !== Category.NOT_CIVIC).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]?.label ?? c}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Urgency Filter */}
        <div className="space-y-1">
          <label
            htmlFor="filter-urgency"
            className="block text-xs font-semibold text-slate-700"
          >
            {STRINGS.authority.filterUrgency}
          </label>
          <select
            id="filter-urgency"
            value={filters.urgency ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                urgency: (e.target.value as Urgency) || undefined,
                cursor: undefined,
              })
            }
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-500 bg-white text-ink focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">{STRINGS.authority.allUrgencies}</option>
            {URGENCIES.map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]?.label ?? u}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Ward Filter */}
        <div className="space-y-1">
          <label
            htmlFor="filter-ward"
            className="block text-xs font-semibold text-slate-700"
          >
            {STRINGS.authority.filterWard}
          </label>
          <select
            id="filter-ward"
            value={filters.ward ?? ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                ward: e.target.value || undefined,
                cursor: undefined,
              })
            }
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-500 bg-white text-ink focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">{STRINGS.authority.allWards}</option>
            {wards.map((w) => (
              <option key={w.number} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Overdue Toggle Checkbox */}
        <div className="flex items-center sm:pt-6">
          <label
            htmlFor="filter-overdue"
            className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-ink"
          >
            <input
              id="filter-overdue"
              type="checkbox"
              checked={filters.overdue === true}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  overdue: e.target.checked ? true : undefined,
                  cursor: undefined,
                })
              }
              className="w-4 h-4 rounded border-slate-500 text-primary focus:ring-primary"
            />
            <span>{STRINGS.authority.filterOverdue}</span>
          </label>
        </div>
      </div>
    </div>
  );
};
