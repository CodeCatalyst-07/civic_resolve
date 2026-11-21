import React, { useState } from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { STRINGS } from '../../../content/strings.js';

export interface FollowUpCardProps {
  question: string;
  round: number;
  onAnswer: (answer: string) => void;
  isLoading?: boolean;
}

export const FollowUpCard: React.FC<FollowUpCardProps> = ({
  question,
  round,
  onAnswer,
  isLoading,
}) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    onAnswer(answer.trim());
    setAnswer('');
  };

  return (
    <div className="p-6 bg-surface border border-amber-200 rounded-xl shadow-subtle space-y-4" data-testid="follow-up-card">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex-shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-ink">
            {STRINGS.report.followUpHeader}
            {round > 0 && <span className="text-xs text-amber-700 font-normal ml-1">(Round {round})</span>}
          </h3>
          <p className="text-xs text-slate-500">{STRINGS.report.followUpGuidance}</p>
        </div>
      </div>

      <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 text-sm font-medium text-amber-950">
        {question}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your clarification here..."
          className="w-full p-3 text-sm bg-surface border border-slate-500 rounded-lg text-ink placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-primary"
          required
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!answer.trim() || isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-700 disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <span>{isLoading ? 'Re-analyzing...' : STRINGS.report.followUpSubmitButton}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
};
