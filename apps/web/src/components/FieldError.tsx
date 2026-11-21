import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FieldErrorProps {
  id?: string;
  error?: string | null;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ id, error, className = '' }) => {
  if (!error) return null;

  return (
    <div
      id={id}
      role="alert"
      className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium text-red-700 ${className}`}
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
};
