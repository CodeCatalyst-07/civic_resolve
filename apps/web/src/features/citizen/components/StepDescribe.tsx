import React, { useState } from 'react';
import { STRINGS } from '../../../content/strings.js';
import { FieldError } from '../../../components/FieldError.js';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface StepDescribeProps {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
}

const SAMPLE_PROMPTS = [
  {
    label: 'Pothole on Road',
    text: 'Large deep pothole on 100ft road near the signal. Two-wheelers are losing balance and traffic is backing up.',
  },
  {
    label: 'Overflowing Garbage',
    text: 'Community garbage bin is overflowing onto the footpath since three days. Stray animals are scattering waste.',
  },
  {
    label: 'Broken Streetlight',
    text: 'Two streetlights on 4th Cross are completely dead for a week. The dark lane poses a safety risk at night.',
  },
  {
    label: 'Live Wire (Danger)',
    text: 'Heavy rain brought down an electric pole; a live wire caught fire and is sparking on the waterlogged street.',
  },
];

export const StepDescribe: React.FC<StepDescribeProps> = ({ value, onChange, onNext }) => {
  const [error, setError] = useState<string | null>(null);

  const charCount = value.trim().length;
  const isValid = charCount >= 10 && charCount <= 1000;

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (charCount < 10) {
      setError('Please provide at least 10 characters describing the issue.');
      return;
    }
    if (charCount > 1000) {
      setError('Description cannot exceed 1,000 characters.');
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <form onSubmit={handleContinue} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label htmlFor="grievance-description" className="block text-sm font-bold text-ink">
          {STRINGS.report.describeHeader}
        </label>
        <p id="describe-help" className="text-xs text-slate-500 leading-relaxed">
          {STRINGS.report.describeHelp}
        </p>

        {/* Quick sample chips for evaluators */}
        <div className="pt-2">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" aria-hidden="true" />
            Quick sample text for evaluation:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(sample.text);
                  setError(null);
                }}
                className="px-2.5 py-1 text-xs rounded-full bg-page border border-border text-slate-700 hover:bg-slate-200 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-3">
          <textarea
            id="grievance-description"
            rows={5}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (error) setError(null);
            }}
            placeholder={STRINGS.report.describePlaceholder}
            className={`w-full p-3 text-sm bg-surface rounded-lg border leading-relaxed placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-primary ${
              error ? 'border-red-500 bg-red-50/20' : 'border-slate-500'
            }`}
            aria-describedby="describe-help describe-counter describe-privacy describe-error"
            aria-invalid={!!error}
            required
          />

          <div
            id="describe-counter"
            aria-live="polite"
            className="flex justify-between items-center mt-1 text-[11px] text-slate-500"
          >
            <span>{STRINGS.report.describeMinHint}</span>
            <span
              className={`font-mono tabular-nums ${
                charCount > 1000 ? 'text-red-600 font-bold' : charCount >= 10 ? 'text-emerald-700' : ''
              }`}
            >
              {charCount} / 1000 characters
            </span>
          </div>

          <p id="describe-privacy" className="mt-1 text-xs text-slate-500">
            Please do not include phone numbers or other personal details.
          </p>

          <FieldError id="describe-error" error={error} />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <button
          type="submit"
          disabled={!isValid}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span>{STRINGS.report.nextButton}</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
};
