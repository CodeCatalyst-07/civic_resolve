import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Status,
  Category,
  Urgency,
  CATEGORIES,
  URGENCIES,
} from '@civicresolve/shared';
import {
  X,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { UrgencyBadge } from '../../../components/UrgencyBadge.js';
import { StatusPill } from '../../../components/StatusPill.js';
import { CategoryChip } from '../../../components/CategoryChip.js';
import { CopyButton } from '../../../components/CopyButton.js';
import { Timeline } from '../../../components/Timeline.js';
import { Skeleton } from '../../../components/Skeleton.js';
import { Callout } from '../../../components/Callout.js';
import { formatDateTime } from '../../../lib/formatters.js';
import {
  STATUS_LABELS,
  CATEGORY_LABELS,
  URGENCY_LABELS,
} from '../../../content/labels.js';
import {
  formatTarget,
  formatConfidence,
  describeDecisionChange,
} from '../utils/formatters.js';
import { getAvailableTransitions } from '../utils/transitions.js';
import {
  useAuthorityTicket,
  useUpdateStatus,
  useOverrideTriage,
  useMeta,
} from '../hooks/index.js';

interface TicketDetailSheetProps {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TicketDetailSheet: React.FC<TicketDetailSheetProps> = ({
  ticketId,
  open,
  onOpenChange,
}) => {
  const { data: ticket, isLoading, isError, refetch } = useAuthorityTicket(ticketId);
  const { data: meta } = useMeta();

  const updateStatusMutation = useUpdateStatus();
  const overrideMutation = useOverrideTriage();

  // Status update form state
  const [selectedNextStatus, setSelectedNextStatus] = useState<Status | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isConflict, setIsConflict] = useState(false);

  // Manual override form state
  const [overrideUrgency, setOverrideUrgency] = useState<Urgency | ''>('');
  const [overrideCategory, setOverrideCategory] = useState<Category | ''>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Reset forms when ticket opens or changes
  React.useEffect(() => {
    setSelectedNextStatus('');
    setStatusNote('');
    setStatusError(null);
    setIsConflict(false);
    setOverrideUrgency('');
    setOverrideCategory('');
    setOverrideReason('');
    setOverrideError(null);
  }, [ticketId, open]);

  const availableTransitions = ticket
    ? getAvailableTransitions(ticket.status, meta?.status_transitions)
    : [];

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !selectedNextStatus) return;

    if (selectedNextStatus === Status.RESOLVED && !statusNote.trim()) {
      setStatusError('A resolution note explaining field actions taken is required when resolving a ticket.');
      return;
    }

    setStatusError(null);
    setIsConflict(false);

    try {
      await updateStatusMutation.mutateAsync({
        id: ticket.id,
        input: {
          status: selectedNextStatus,
          note: statusNote.trim() || undefined,
        },
      });
      setSelectedNextStatus('');
      setStatusNote('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('conflict') || (err as { status?: number })?.status === 409) {
        setIsConflict(true);
      } else {
        setStatusError(msg);
      }
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    if (!overrideReason.trim() || overrideReason.trim().length < 5) {
      setOverrideError('A detailed reason (at least 5 characters) is required for supervisor manual overrides.');
      return;
    }

    if (!overrideUrgency && !overrideCategory) {
      setOverrideError('Select at least one attribute (urgency or category) to override.');
      return;
    }

    setOverrideError(null);

    try {
      await overrideMutation.mutateAsync({
        id: ticket.id,
        input: {
          urgency: overrideUrgency ? (overrideUrgency as Urgency) : undefined,
          category: overrideCategory ? (overrideCategory as Category) : undefined,
          reason: overrideReason.trim(),
        },
      });
      setOverrideUrgency('');
      setOverrideCategory('');
      setOverrideReason('');
    } catch (err: unknown) {
      setOverrideError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 w-full sm:w-[540px] bg-surface shadow-2xl border-l border-border p-6 overflow-y-auto focus:outline-none flex flex-col gap-6"
          aria-describedby="ticket-detail-description"
        >
          {/* 1. Header */}
          <div className="flex items-start justify-between pb-4 border-b border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Dialog.Title className="text-xl font-bold font-mono text-ink tracking-tight">
                  {ticket?.id || ticketId}
                </Dialog.Title>
                {ticket && <CopyButton value={ticket.id} label="Copy ID" />}
              </div>
              <p id="ticket-detail-description" className="text-xs text-slate-500">
                Municipal investigation and operational dispatch file
              </p>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-400 hover:text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Close details panel"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {isLoading && (
            <div className="space-y-4 py-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {isError && (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mx-auto" aria-hidden="true" />
              <h3 className="text-sm font-bold text-ink">Failed to load grievance details</h3>
              <p className="text-xs text-slate-600">Could not retrieve ticket records from the server.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}

          {ticket && (
            <div className="space-y-6">
              {/* Badges bar */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={ticket.status} />
                <UrgencyBadge urgency={ticket.urgency} />
                <CategoryChip category={ticket.category} />
                {ticket.overdue && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-orange-100 text-[#C2410C] border border-orange-200">
                    Overdue
                  </span>
                )}
              </div>

              {/* Emergency notice if present */}
              {ticket.emergency_notice && (
                <Callout
                  variant="emergency"
                  title="Life-Safety Hazard Active"
                >
                  This report involves an immediate threat to public safety. Emergency response procedures apply.
                </Callout>
              )}

              {/* 2. What was reported */}
              <div className="space-y-2.5 p-4 bg-page rounded-xl border border-border">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <span>Citizen Report</span>
                  <time dateTime={ticket.created_at} className="normal-case font-normal text-slate-500 tabular-nums">
                    {formatDateTime(ticket.created_at)}
                  </time>
                </div>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
                </p>
                <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    <span>{ticket.ward || ticket.location?.address || 'No specific ward'}</span>
                  </div>
                  {ticket.location?.lat !== undefined && ticket.location?.lng !== undefined && (
                    <span className="font-mono text-slate-500">
                      {ticket.location.lat.toFixed(4)}, {ticket.location.lng.toFixed(4)}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                    <span>Target: {formatTarget(ticket.due_at).label}</span>
                  </div>
                </div>
              </div>

              {/* 3. AI Suggestion vs Final Decision Diff */}
              <div className="space-y-3 p-4 bg-surface rounded-xl border border-border">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>AI Suggestion vs Decision Diff</span>
                </div>

                {ticket.ai_suggestion ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">AI Suggestion:</span>
                        <span className="font-semibold text-ink">
                          {CATEGORY_LABELS[ticket.ai_suggestion.category]?.label || ticket.ai_suggestion.category} ({ticket.ai_suggestion.urgency})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Confidence:</span>
                        <span className="font-semibold text-ink">
                          {formatConfidence(ticket.ai_suggestion.confidence)}
                        </span>
                      </div>
                    </div>

                    {/* Diff highlights */}
                    {describeDecisionChange(
                      ticket.ai_suggestion,
                      ticket,
                      ticket.applied_rules,
                      ticket.timeline
                    ).map((change, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">{change.field} Changed</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              change.author === 'automatic'
                                ? 'bg-blue-100 text-primary'
                                : 'bg-teal-100 text-accent'
                            }`}
                          >
                            {change.author === 'automatic' ? 'Automatic Rule' : 'Staff Override'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 font-medium text-slate-700">
                          <span className="line-through text-slate-400">{change.from}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                          <span className="font-bold text-primary">{change.to}</span>
                        </div>
                        {change.reason && (
                          <p className="text-[11px] text-slate-600 italic">
                            Reason: {change.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Rule-based triage applied without generative model suggestion.
                  </p>
                )}
              </div>

              {/* 4. Duplicate cluster */}
              {ticket.duplicate_count > 0 && (
                <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                    <Layers className="w-4 h-4 text-accent" aria-hidden="true" />
                    <span>Duplicate Cluster Primary</span>
                  </div>
                  <p className="text-xs text-teal-800">
                    This grievance aggregates <strong>{ticket.duplicate_count} duplicate report(s)</strong> from nearby citizens, elevating its priority.
                  </p>
                </div>
              )}

              {/* 5. Update Status Form */}
              <div className="space-y-3 p-4 bg-surface rounded-xl border border-border">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>Update Lifecycle Status</span>
                </div>

                {isConflict && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2 text-xs text-amber-900">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700" aria-hidden="true" />
                      <span>Concurrency Conflict</span>
                    </div>
                    <p>This report was modified by another officer since you opened it. Please reload to inspect recent changes before saving.</p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="px-3 py-1 font-semibold rounded bg-amber-200 text-amber-900 hover:bg-amber-300"
                    >
                      Reload Report
                    </button>
                  </div>
                )}

                {statusError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {statusError}
                  </div>
                )}

                {availableTransitions.length > 0 ? (
                  <form onSubmit={handleStatusSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="next-status" className="block text-xs font-semibold text-slate-700">
                        Next Legal Status
                      </label>
                      <select
                        id="next-status"
                        value={selectedNextStatus}
                        onChange={(e) => setSelectedNextStatus(e.target.value as Status)}
                        className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-500 bg-white text-ink focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <option value="">Select new status...</option>
                        {availableTransitions.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]?.label || s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="status-note" className="block text-xs font-semibold text-slate-700">
                        Resolution Note {selectedNextStatus === Status.RESOLVED && <span className="text-red-600">* (Required)</span>}
                      </label>
                      <textarea
                        id="status-note"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder={
                          selectedNextStatus === Status.RESOLVED
                            ? 'Explain work completed by municipal field gang or contractor...'
                            : 'Optional status transition or dispatch note...'
                        }
                        rows={3}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-500 bg-white text-ink placeholder-slate-400 focus-visible:outline-2 focus-visible:outline-primary"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedNextStatus || updateStatusMutation.isPending}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {updateStatusMutation.isPending ? 'Updating Status...' : 'Apply Status Update'}
                    </button>
                  </form>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    This grievance is in terminal status ({STATUS_LABELS[ticket.status]?.label || ticket.status}) and cannot be transitioned further by municipal staff.
                  </p>
                )}
              </div>

              {/* 6. Manual Override Disclosure */}
              <details className="group p-4 bg-surface rounded-xl border border-border space-y-3">
                <summary className="cursor-pointer text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <span>Supervisor Manual Override</span>
                  </div>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>

                {overrideError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {overrideError}
                  </div>
                )}

                <form onSubmit={handleOverrideSubmit} className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label htmlFor="override-urgency" className="block text-xs font-semibold text-slate-700">
                        Adjust Urgency
                      </label>
                      <select
                        id="override-urgency"
                        value={overrideUrgency}
                        onChange={(e) => setOverrideUrgency(e.target.value as Urgency)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-500 bg-white text-ink focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <option value="">Keep current ({ticket.urgency})</option>
                        {URGENCIES.map((u) => (
                          <option key={u} value={u}>
                            {URGENCY_LABELS[u]?.label || u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="override-category" className="block text-xs font-semibold text-slate-700">
                        Adjust Category
                      </label>
                      <select
                        id="override-category"
                        value={overrideCategory}
                        onChange={(e) => setOverrideCategory(e.target.value as Category)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-500 bg-white text-ink focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <option value="">Keep current</option>
                        {CATEGORIES.filter((c) => c !== Category.NOT_CIVIC).map((c) => (
                          <option key={c} value={c}>
                            {CATEGORY_LABELS[c]?.label || c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="override-reason" className="block text-xs font-semibold text-slate-700">
                      Override Justification <span className="text-red-600">* (Min 5 chars)</span>
                    </label>
                    <textarea
                      id="override-reason"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="e.g. Upgraded to high due to school zone proximity confirmed by field inspector."
                      rows={2}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-500 bg-white text-ink placeholder-slate-400 focus-visible:outline-2 focus-visible:outline-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={overrideMutation.isPending || (!overrideUrgency && !overrideCategory)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-500 bg-white text-ink hover:bg-page disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {overrideMutation.isPending ? 'Saving Override...' : 'Submit Supervisor Override'}
                  </button>
                </form>
              </details>

              {/* 7. Timeline History */}
              <div className="space-y-3 pt-2 border-t border-border">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Operational Audit Trail
                </h3>
                <Timeline events={ticket.timeline} />
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
