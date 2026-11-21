import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { STRINGS } from '../content/strings.js';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = STRINGS.errors.genericTitle,
  message = STRINGS.errors.genericMessage,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-8 text-center bg-red-50/50 border border-red-200 rounded-lg ${className}`}
      data-testid="error-state"
    >
      <div className="flex items-center justify-center w-12 h-12 mb-3 rounded-full bg-red-100 text-red-600">
        <AlertTriangle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-red-950">{title}</h3>
      <p className="mt-1 text-sm text-red-800 max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-xs font-semibold rounded-md bg-white border border-red-300 text-red-700 hover:bg-red-50 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          {STRINGS.errors.tryAgain}
        </button>
      )}
    </div>
  );
};
