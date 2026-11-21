import React from 'react';
import type {
  Category,
  AnalyzeResult,
} from '@civicresolve/shared';
import { STRINGS } from '../../../content/strings.js';
import { TriageCard } from './TriageCard.js';
import { FollowUpCard } from './FollowUpCard.js';
import { RejectedCard } from './RejectedCard.js';
import { SimilarReportsPanel } from './SimilarReportsPanel.js';
import { Callout } from '../../../components/Callout.js';
import { ArrowLeft, Check } from 'lucide-react';

export interface StepReviewProps {
  analysis: AnalyzeResult;
  categoryOverride: Category | null;
  onCategoryOverrideChange: (cat: Category | null) => void;
  onAnswerFollowUp: (answer: string) => void;
  onSubmitReport: () => void;
  onSupportExisting: (ticketId: string) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  isSupporting?: boolean;
}

export const StepReview: React.FC<StepReviewProps> = ({
  analysis,
  categoryOverride,
  onCategoryOverrideChange,
  onAnswerFollowUp,
  onSubmitReport,
  onSupportExisting,
  onBack,
  isSubmitting,
  isSupporting,
}) => {
  const { outcome, similar_reports, meta } = analysis;

  const showSimilarFirst =
    similar_reports && similar_reports.length > 0 && outcome.kind === 'ticket';

  return (
    <div className="space-y-6" data-testid="step-review">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-ink">{STRINGS.report.reviewHeader}</h2>
        <p className="text-xs text-slate-500 leading-relaxed">{STRINGS.report.reviewSubtitle}</p>
      </div>

      {/* Emergency Notice Callout (if danger detected or emergency flag set) */}
      {((outcome.kind !== 'follow_up' && outcome.emergency_notice) || (outcome.kind === 'ticket' && outcome.decision.emergency_notice)) && (
        <Callout variant="emergency" title={STRINGS.report.emergencyNoticeTitle}>
          <p>{STRINGS.report.emergencyNoticeCallout}</p>
        </Callout>
      )}

      {/* Similar Reports Detection (Prioritized if matches found) */}
      {showSimilarFirst && (
        <SimilarReportsPanel
          similarReports={similar_reports}
          onSupport={onSupportExisting}
          onSubmitAnyway={onSubmitReport}
          isSupporting={isSupporting}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Outcome-specific view */}
      {outcome.kind === 'ticket' && (
        <TriageCard
          decision={outcome.decision}
          categoryOverride={categoryOverride}
          onCategoryOverrideChange={onCategoryOverrideChange}
          aiSource={meta.ai_source}
          degraded={meta.degraded}
        />
      )}

      {outcome.kind === 'follow_up' && (
        <FollowUpCard
          question={outcome.question}
          round={outcome.round}
          onAnswer={onAnswerFollowUp}
        />
      )}

      {outcome.kind === 'rejected' && (
        <RejectedCard
          reason={outcome.reason}
          guidance={outcome.guidance}
          emergencyNotice={outcome.emergency_notice}
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting || isSupporting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-border text-ink hover:bg-page transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{STRINGS.report.backButton}</span>
        </button>

        {outcome.kind === 'ticket' && (
          <button
            type="button"
            onClick={onSubmitReport}
            disabled={isSubmitting || isSupporting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            <span>{isSubmitting ? STRINGS.report.submittingButton : STRINGS.report.confirmButton}</span>
          </button>
        )}
      </div>
    </div>
  );
};
