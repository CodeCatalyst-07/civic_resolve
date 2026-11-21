import React, { useState } from 'react';
import type { PublicTicketView } from '@civicresolve/shared';
import { Status } from '@civicresolve/shared';
import { STRINGS } from '../../../content/strings.js';
import { UrgencyBadge } from '../../../components/UrgencyBadge.js';
import { StatusPill } from '../../../components/StatusPill.js';
import { CategoryChip } from '../../../components/CategoryChip.js';
import { Timeline } from '../../../components/Timeline.js';
import { CopyButton } from '../../../components/CopyButton.js';
import { Callout } from '../../../components/Callout.js';
import { ReopenDialog } from './ReopenDialog.js';
import { formatDateTime } from '../../../lib/formatters.js';
import {
  Building2,
  Calendar,
  ThumbsUp,
  MapPin,
  CheckCircle2,
  RotateCcw,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export interface TrackViewProps {
  ticket: PublicTicketView;
  onSupport: () => Promise<void>;
  onReopen: (note: string) => Promise<void>;
}

export const TrackView: React.FC<TrackViewProps> = ({ ticket, onSupport, onReopen }) => {
  const [reopenOpen, setReopenOpen] = useState(false);
  const [isSupporting, setIsSupporting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);

  const canReopen = ticket.status === Status.RESOLVED;

  const handleSupportClick = async () => {
    setIsSupporting(true);
    try {
      await onSupport();
      setSupportSuccess(true);
      setTimeout(() => setSupportSuccess(false), 4000);
    } finally {
      setIsSupporting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="track-view">
      {/* Ticket Header Card */}
      <div className="p-6 bg-surface border border-border rounded-xl shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Grievance Reference Code
            </span>
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl font-mono font-black text-ink tabular-nums">
                {ticket.id}
              </span>
              <CopyButton value={ticket.id} label="Copy" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={ticket.category} />
            <UrgencyBadge urgency={ticket.urgency} />
            <StatusPill status={ticket.status} />
          </div>
        </div>

        {/* Overdue Warning Callout */}
        {ticket.overdue && (
          <Callout variant="warning" title="SLA Escalated">
            <p>{STRINGS.track.overdueWarning}</p>
          </Callout>
        )}

        {/* Emergency Notice Callout */}
        {ticket.emergency_notice && (
          <Callout variant="emergency" title={STRINGS.report.emergencyNoticeTitle}>
            <p>{STRINGS.report.emergencyNoticeCallout}</p>
          </Callout>
        )}

        {/* Summary Description */}
        <div className="space-y-1.5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Issue Description
          </h2>
          <p className="text-sm font-medium text-ink leading-relaxed bg-page p-3.5 rounded-lg border border-border">
            {ticket.summary}
          </p>
        </div>

        {/* Key Grievance Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3 bg-page rounded-lg border border-border space-y-1">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Department:
            </span>
            <span className="font-bold text-ink block">{ticket.department}</span>
          </div>

          <div className="p-3 bg-page rounded-lg border border-border space-y-1">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Ward:
            </span>
            <span className="font-bold text-ink block">{ticket.ward || 'General City'}</span>
          </div>

          <div className="p-3 bg-page rounded-lg border border-border space-y-1">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Reported On:
            </span>
            <span className="font-bold text-ink block tabular-nums">
              {formatDateTime(ticket.created_at)}
            </span>
          </div>

          <div className="p-3 bg-page rounded-lg border border-border space-y-1">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Target Resolution:
            </span>
            <span
              className={`font-bold block tabular-nums ${
                ticket.overdue ? 'text-urgency-high' : 'text-ink'
              }`}
            >
              {formatDateTime(ticket.due_at)}
            </span>
          </div>
        </div>

        {/* Citizen Support and Duplicate Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-accent" aria-hidden="true" />
            <span>
              <strong className="text-ink tabular-nums">{ticket.duplicate_count}</strong>{' '}
              {STRINGS.track.duplicateNotice}
            </span>
          </div>

          {ticket.status !== Status.RESOLVED &&
            ticket.status !== Status.CLOSED &&
            ticket.status !== Status.REJECTED && (
              <button
                type="button"
                onClick={handleSupportClick}
                disabled={isSupporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-accent text-white hover:bg-teal-700 disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              >
                <ThumbsUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isSupporting ? 'Recording...' : STRINGS.track.supportButton}</span>
              </button>
            )}
        </div>

        {supportSuccess && (
          <p role="status" className="text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-md border border-emerald-200">
            {STRINGS.track.supportedSuccess}
          </p>
        )}
      </div>

      {/* Applied Safety Rules */}
      {ticket.applied_rules && ticket.applied_rules.length > 0 && (
        <div className="p-6 bg-surface border border-border rounded-xl shadow-subtle space-y-3">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
            Safety & Priority Rules Enforced
          </h2>
          <div className="space-y-1.5">
            {ticket.applied_rules.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-md bg-blue-50/50 border border-blue-100 text-xs text-blue-950"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" aria-hidden="true" />
                <div>
                  <span className="font-semibold">{rule.label}</span>
                  <span className="text-blue-800 ml-1.5">— {rule.effect}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Timeline */}
      <div className="p-6 bg-surface border border-border rounded-xl shadow-subtle space-y-4">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {STRINGS.track.timelineHeader}
        </h2>
        <Timeline events={ticket.timeline} />
      </div>

      {/* Reopen Action (when resolved) */}
      {canReopen && (
        <div className="p-6 bg-orange-50/40 border border-orange-200 rounded-xl shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-orange-950">{STRINGS.track.reopenHeader}</h3>
            <p className="text-xs text-orange-900 leading-relaxed max-w-md">
              {STRINGS.track.reopenNotice}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReopenOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-urgency-high text-white hover:bg-orange-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary flex-shrink-0"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>{STRINGS.track.reopenButton}</span>
          </button>
        </div>
      )}

      {/* Reopen Dialog */}
      <ReopenDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        ticketId={ticket.id}
        onConfirmReopen={onReopen}
      />
    </div>
  );
};
