import React from 'react';
import type { PublicTicketSummary } from '@civicresolve/shared';
import { STRINGS } from '../../../content/strings.js';
import { CategoryChip } from '../../../components/CategoryChip.js';
import { UrgencyBadge } from '../../../components/UrgencyBadge.js';
import { StatusPill } from '../../../components/StatusPill.js';
import { formatDate } from '../../../lib/formatters.js';
import { ThumbsUp, AlertCircle } from 'lucide-react';

export interface SimilarReportsPanelProps {
  similarReports: readonly PublicTicketSummary[];
  onSupport: (ticketId: string) => void;
  onSubmitAnyway: () => void;
  isSupporting?: boolean;
  isSubmitting?: boolean;
}

export const SimilarReportsPanel: React.FC<SimilarReportsPanelProps> = ({
  similarReports,
  onSupport,
  onSubmitAnyway,
  isSupporting,
  isSubmitting,
}) => {
  if (!similarReports || similarReports.length === 0) {
    return null;
  }

  return (
    <div
      className="p-6 bg-amber-50/40 border border-amber-200 rounded-xl shadow-subtle space-y-4"
      data-testid="similar-reports-panel"
      role="region"
      aria-labelledby="similar-reports-heading"
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex-shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 id="similar-reports-heading" className="text-sm font-bold text-amber-950">
            {STRINGS.report.similarHeader}
          </h3>
          <p className="text-xs text-amber-900 leading-relaxed">
            {STRINGS.report.similarDescription}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {similarReports.map((report) => (
          <div
            key={report.id}
            className="p-4 bg-surface border border-border rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            data-testid={`similar-ticket-${report.id}`}
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryChip category={report.category} />
                <UrgencyBadge urgency={report.urgency} />
                <StatusPill status={report.status} />
                <span className="text-xs font-mono text-slate-500 font-bold">{report.id}</span>
              </div>
              <p className="text-xs font-medium text-ink truncate">{report.summary}</p>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>Reported {formatDate(report.created_at)}</span>
                <span>·</span>
                <span className="font-semibold text-primary">
                  {report.duplicate_count} citizen{report.duplicate_count === 1 ? '' : 's'} supported
                </span>
              </div>
            </div>

            <div className="flex-shrink-0">
              <button
                type="button"
                onClick={() => onSupport(report.id)}
                disabled={isSupporting || isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-accent text-white hover:bg-teal-700 disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              >
                <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isSupporting ? 'Supporting...' : 'Support This Report'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onSubmitAnyway}
          disabled={isSupporting || isSubmitting}
          className="text-xs font-semibold text-slate-600 hover:text-ink underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {STRINGS.report.submitAnywayButton}
        </button>
      </div>
    </div>
  );
};
