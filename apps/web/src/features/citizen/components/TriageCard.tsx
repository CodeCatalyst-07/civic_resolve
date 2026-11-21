import React from 'react';
import {
  Category,
  Urgency,
  type FinalDecision,
  type AiSource,
  CATEGORIES,
} from '@civicresolve/shared';
import { UrgencyBadge } from '../../../components/UrgencyBadge.js';
import { CategoryChip } from '../../../components/CategoryChip.js';
import { CATEGORY_LABELS, DEPARTMENT_LABELS } from '../../../content/labels.js';
import { STRINGS } from '../../../content/strings.js';
import { Sparkles, Building2, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export interface TriageCardProps {
  decision: FinalDecision;
  categoryOverride: Category | null;
  onCategoryOverrideChange: (cat: Category | null) => void;
  aiSource?: AiSource;
  degraded?: boolean;
}

export const TriageCard: React.FC<TriageCardProps> = ({
  decision,
  categoryOverride,
  onCategoryOverrideChange,
  aiSource,
  degraded,
}) => {
  const effectiveCategory = categoryOverride || decision.category;
  const deptMeta = decision.department ? DEPARTMENT_LABELS[decision.department] : undefined;

  const getSourceLabel = (src?: AiSource) => {
    switch (src) {
      case 'gemini':
        return 'Analyzed by Google Gemini';
      case 'jarvis_gemma':
        return 'Analyzed by Jarvis Gemma 2';
      case 'keyword_fallback':
        return 'Analyzed by Transparent Keyword Rules (AI Fallback)';
      case 'mock':
        return 'Analyzed in Offline Mock Mode';
      default:
        return 'Automated AI Triage';
    }
  };

  return (
    <div className="p-6 bg-surface border border-border rounded-xl shadow-subtle space-y-6" data-testid="triage-card">
      {/* Header and Provenance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border">
        <div className="space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Automated Analysis Result
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <CategoryChip category={effectiveCategory} />
            <UrgencyBadge urgency={decision.urgency} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-page px-3 py-1.5 rounded-full border border-border">
          <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          <span>{getSourceLabel(aiSource)}</span>
          {degraded && (
            <span className="text-amber-700 font-semibold">(Fallback mode)</span>
          )}
        </div>
      </div>

      {/* AI Summary and Reasons */}
      {decision.ai_suggestion && (
        <div className="space-y-2 bg-page/70 p-4 rounded-lg border border-border">
          <span className="text-xs font-semibold text-ink block">Issue Summary</span>
          <p className="text-sm font-medium text-ink leading-relaxed">
            {decision.ai_suggestion.summary}
          </p>
          {decision.ai_suggestion.reasons.length > 0 && (
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pt-1">
              {decision.ai_suggestion.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Dispatch and SLA */}
      <div className="grid sm:grid-cols-2 gap-4 text-xs">
        <div className="p-3 bg-page rounded-lg border border-border space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Building2 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>Assigned City Department</span>
          </div>
          <span className="text-sm font-bold text-ink block">
            {deptMeta ? deptMeta.label : 'Local Ward Office'}
          </span>
          {deptMeta && (
            <span className="text-[11px] text-slate-500 block">
              Authority: {deptMeta.indianEquivalent}
            </span>
          )}
        </div>

        <div className="p-3 bg-page rounded-lg border border-border space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span>Resolution Target (SLA)</span>
          </div>
          <span className="text-sm font-bold text-ink block">
            {decision.urgency === Urgency.CRITICAL
              ? '24 hours (Immediate Danger)'
              : decision.urgency === Urgency.HIGH
              ? '48 hours (Urgent)'
              : decision.urgency === Urgency.MEDIUM
              ? '96 hours (Routine Maintenance)'
              : '168 hours (Minor / Cosmetic)'}
          </span>
          <span className="text-[11px] text-slate-500 block">
            Guaranteed under Public Service Guarantee charter
          </span>
        </div>
      </div>

      {/* Applied Deterministic Rules */}
      {decision.applied_rules && decision.applied_rules.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-ink block">Safety & Priority Rules Applied:</span>
          <div className="space-y-1.5">
            {decision.applied_rules.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-md bg-blue-50/50 border border-blue-100 text-xs text-blue-950"
              >
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                <div>
                  <span className="font-semibold">{rule.label}</span>
                  <span className="text-blue-800 ml-1.5">— {rule.effect}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Override Accordion / Selector */}
      <div className="pt-4 border-t border-border space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="text-xs font-bold text-ink block">
              {STRINGS.report.categoryOverrideLabel}
            </span>
            <span className="text-[11px] text-slate-500 leading-relaxed block">
              {STRINGS.report.categoryOverrideHelp}
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          {CATEGORIES.filter((c) => c !== Category.NOT_CIVIC).map((cat) => {
            const isSelected = effectiveCategory === cat;
            const meta = CATEGORY_LABELS[cat];

            return (
              <label
                key={cat}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-blue-50/50 font-semibold text-primary'
                    : 'border-border bg-surface text-ink hover:bg-page'
                }`}
              >
                <input
                  type="radio"
                  name="categoryOverride"
                  value={cat}
                  checked={isSelected}
                  onChange={() => {
                    if (cat === decision.category) {
                      onCategoryOverrideChange(null);
                    } else {
                      onCategoryOverrideChange(cat);
                    }
                  }}
                  className="w-3.5 h-3.5 text-primary focus:ring-primary"
                />
                <span>{meta.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
