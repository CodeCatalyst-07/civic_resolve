import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getApiClient } from '../../../lib/apiClient.js';
import { Skeleton } from '../../../components/Skeleton.js';
import { AlertCircle, CheckCircle, Clock, Flame, Hourglass } from 'lucide-react';
import { STRINGS } from '../../../content/strings.js';

export const PublicStatsStrip: React.FC = () => {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['systemStats'],
    queryFn: () => getApiClient().getStats(),
  });

  if (isError) {
    return null; // Gracefully omit strip if stats API unavailable
  }

  const statItems = [
    {
      label: 'Open Grievances',
      value: stats?.open,
      icon: Clock,
      color: 'text-primary',
      bg: 'bg-blue-50',
    },
    {
      label: 'Resolved Issues',
      value: stats?.resolved,
      icon: CheckCircle,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Critical / Danger',
      value: stats?.critical_open,
      icon: Flame,
      color: 'text-urgency-critical',
      bg: 'bg-urgency-critical-bg',
    },
    {
      label: 'Overdue (Escalated)',
      value: stats?.overdue,
      icon: AlertCircle,
      color: 'text-urgency-high',
      bg: 'bg-urgency-high-bg',
    },
    {
      label: 'Median Fix Time',
      value: stats !== undefined ? `${stats.median_resolution_hours}h` : undefined,
      icon: Hourglass,
      color: 'text-accent',
      bg: 'bg-teal-50',
    },
  ];

  return (
    <section aria-labelledby="stats-heading" className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-border">
        <div>
          <h2 id="stats-heading" className="text-lg font-bold text-ink">
            {STRINGS.home.statsTitle}
          </h2>
          <p className="text-xs text-slate-500">{STRINGS.home.statsSubtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statItems.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-4 bg-surface border border-border rounded-lg shadow-subtle"
            data-testid={`stat-${item.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
          >
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${item.bg} ${item.color} flex-shrink-0`}>
              <item.icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-medium text-slate-500 truncate">{item.label}</span>
              {isLoading ? (
                <Skeleton className="h-6 w-12 mt-1" />
              ) : (
                <span className="block text-lg font-bold text-ink tabular-nums">
                  {item.value !== undefined ? item.value : '0'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
