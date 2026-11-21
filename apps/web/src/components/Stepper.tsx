import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: number;
  title: string;
}

export interface StepperProps {
  steps: readonly StepItem[];
  currentStep: number;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  className = '',
}) => {
  return (
    <nav aria-label="Progress" className={`w-full ${className}`}>
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isLast = idx === steps.length - 1;

          return (
            <li
              key={step.id}
              className={`relative flex items-center ${isLast ? 'flex-none' : 'flex-1'}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex items-center gap-2 group">
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 transition-colors ${
                    isCompleted
                      ? 'bg-primary text-white border-primary'
                      : isCurrent
                      ? 'bg-surface text-primary border-primary ring-4 ring-blue-100'
                      : 'bg-page text-slate-500 border-border'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" aria-hidden="true" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </span>
                <span
                  className={`hidden sm:inline-block text-xs font-medium ${
                    isCurrent ? 'text-ink font-semibold' : 'text-slate-500'
                  }`}
                >
                  {step.title}
                </span>
              </div>

              {!isLast && (
                <div
                  className={`flex-1 mx-3 sm:mx-4 h-0.5 transition-colors ${
                    isCompleted ? 'bg-primary' : 'bg-border'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
