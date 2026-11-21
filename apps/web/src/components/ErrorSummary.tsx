import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ErrorSummaryProps {
  title?: string;
  errors: readonly string[];
  className?: string;
}

export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  title = 'Please correct the following errors:',
  errors,
  className = '',
}) => {
  if (!errors || errors.length === 0) return null;

  return (
    <div
      role="alert"
      aria-labelledby="error-summary-title"
      tabIndex={-1}
      className={`p-4 rounded-lg border border-red-200 bg-red-50 text-red-950 focus:outline-none focus:ring-2 focus:ring-red-500 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <h2 id="error-summary-title" className="text-sm font-semibold">
            {title}
          </h2>
          <ul className="list-disc list-inside text-xs space-y-1 text-red-800">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
