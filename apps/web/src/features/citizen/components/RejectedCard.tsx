import React from 'react';
import { XCircle } from 'lucide-react';
import { STRINGS } from '../../../content/strings.js';
import { Callout } from '../../../components/Callout.js';

export interface RejectedCardProps {
  reason: string;
  guidance: string;
  emergencyNotice?: boolean;
}

export const RejectedCard: React.FC<RejectedCardProps> = ({
  reason,
  guidance,
  emergencyNotice,
}) => {
  return (
    <div className="p-6 bg-surface border border-red-200 rounded-xl shadow-subtle space-y-4" data-testid="rejected-card">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 flex-shrink-0 mt-0.5">
          <XCircle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-red-950">{STRINGS.report.rejectedHeader}</h3>
          <p className="text-xs text-slate-500">{STRINGS.report.rejectedGuidance}</p>
        </div>
      </div>

      <div className="p-4 bg-red-50/50 rounded-lg border border-red-200 space-y-2 text-xs text-red-950">
        <div>
          <span className="font-semibold block mb-0.5">Explanation:</span>
          <span>{reason}</span>
        </div>
        {guidance && (
          <div className="pt-2 border-t border-red-200/60">
            <span className="font-semibold block mb-0.5">Recommended Next Steps:</span>
            <span>{guidance}</span>
          </div>
        )}
      </div>

      {emergencyNotice && (
        <Callout variant="emergency" title={STRINGS.report.emergencyNoticeTitle}>
          <p>{STRINGS.report.emergencyNoticeCallout}</p>
        </Callout>
      )}
    </div>
  );
};
