import React from 'react';
import { Link } from 'react-router-dom';
import type { PublicTicketView } from '@civicresolve/shared';
import { STRINGS } from '../../../content/strings.js';
import { UrgencyBadge } from '../../../components/UrgencyBadge.js';
import { StatusPill } from '../../../components/StatusPill.js';
import { CategoryChip } from '../../../components/CategoryChip.js';
import { CopyButton } from '../../../components/CopyButton.js';
import { formatDateTime } from '../../../lib/formatters.js';
import { CheckCircle2, Search, PlusCircle, Building2, Calendar } from 'lucide-react';

export interface StepConfirmationProps {
  ticket: PublicTicketView;
  onReset: () => void;
}

export const StepConfirmation: React.FC<StepConfirmationProps> = ({ ticket, onReset }) => {
  return (
    <div className="max-w-xl mx-auto space-y-8 text-center" data-testid="step-confirmation">
      {/* Success Icon & Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-1">
          <CheckCircle2 className="w-10 h-10" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-extrabold text-ink tracking-tight">
          {STRINGS.report.confirmationHeader}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {STRINGS.report.confirmationSub}
        </p>
      </div>

      {/* Tracking Code Highlight Box */}
      <div className="p-6 bg-surface border-2 border-primary/20 rounded-2xl shadow-subtle space-y-4">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
          {STRINGS.report.trackingCodeLabel}
        </span>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <span className="text-3xl sm:text-4xl font-mono font-black text-primary tracking-wider tabular-nums">
            {ticket.id}
          </span>
          <CopyButton value={ticket.id} label="Copy" className="text-sm px-4 py-2" />
        </div>

        <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
          {STRINGS.report.saveCodeNotice}
        </p>

        <div className="pt-4 border-t border-border grid grid-cols-2 gap-3 text-left text-xs">
          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Department:
            </span>
            <span className="font-bold text-ink block">{ticket.department}</span>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Target Resolution:
            </span>
            <span className="font-bold text-ink block tabular-nums">
              {formatDateTime(ticket.due_at)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <CategoryChip category={ticket.category} />
          <UrgencyBadge urgency={ticket.urgency} />
          <StatusPill status={ticket.status} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          to={`/track/${ticket.id}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Search className="w-4 h-4" aria-hidden="true" />
          <span>{STRINGS.report.trackNowButton}</span>
        </Link>

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-surface border border-border text-ink hover:bg-page transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          <PlusCircle className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>{STRINGS.report.fileAnotherButton}</span>
        </button>
      </div>
    </div>
  );
};
