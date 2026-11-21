import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getApiClient } from '../../../lib/apiClient.js';
import { Skeleton } from '../../../components/Skeleton.js';
import { UrgencyBadge } from '../../../components/UrgencyBadge.js';
import { StatusPill } from '../../../components/StatusPill.js';
import { CategoryChip } from '../../../components/CategoryChip.js';
import { EmptyState } from '../../../components/EmptyState.js';
import { formatDate } from '../../../lib/formatters.js';
import { STRINGS } from '../../../content/strings.js';
import { ArrowRight, Inbox } from 'lucide-react';

export const RecentReportsList: React.FC = () => {
  const { data: reports, isLoading, isError } = useQuery({
    queryKey: ['recentReports'],
    queryFn: () => getApiClient().getRecentReports(6),
  });

  if (isError) {
    return null;
  }

  return (
    <section aria-labelledby="recent-heading" className="w-full">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
        <div>
          <h2 id="recent-heading" className="text-lg font-bold text-ink">
            {STRINGS.home.recentTitle}
          </h2>
          <p className="text-xs text-slate-500">{STRINGS.home.recentSubtitle}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-surface border border-border rounded-lg space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : !reports || reports.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No Recent Grievances"
          description={STRINGS.home.noRecentReports}
          action={
            <Link
              to="/report"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-md hover:bg-blue-700"
            >
              Report an Issue
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <article
              key={report.id}
              className="flex flex-col justify-between p-4 bg-surface border border-border rounded-lg shadow-subtle hover:border-slate-300 transition-colors"
              data-testid={`recent-card-${report.id}`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <CategoryChip category={report.category} />
                  <UrgencyBadge urgency={report.urgency} />
                </div>

                <p className="text-sm font-medium text-ink line-clamp-2 leading-snug">
                  {report.summary}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-border flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <StatusPill status={report.status} />
                  <time dateTime={report.created_at} className="text-slate-400 tabular-nums">
                    {formatDate(report.created_at)}
                  </time>
                </div>

                <Link
                  to={`/track/${report.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`View details for grievance ${report.id}`}
                >
                  <span className="font-mono">{report.id}</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
