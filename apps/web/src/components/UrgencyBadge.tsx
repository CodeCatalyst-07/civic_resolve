import React from 'react';
import type { Urgency } from '@civicresolve/shared';
import { URGENCY_LABELS } from '../content/labels.js';

export interface UrgencyBadgeProps {
  urgency: Urgency;
  className?: string;
  showIcon?: boolean;
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  urgency,
  className = '',
  showIcon = true,
}) => {
  const meta = URGENCY_LABELS[urgency] || URGENCY_LABELS.low;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${meta.badgeColor} ${className}`}
      data-testid={`urgency-badge-${urgency}`}
      role="status"
      aria-label={`Urgency: ${meta.label}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
      <span>{meta.label}</span>
    </span>
  );
};
