import React from 'react';
import type { Status } from '@civicresolve/shared';
import { STATUS_LABELS } from '../content/labels.js';

export interface StatusPillProps {
  status: Status;
  className?: string;
  showIcon?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  className = '',
  showIcon = true,
}) => {
  const meta = STATUS_LABELS[status] || STATUS_LABELS.submitted;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${meta.pillColor} ${className}`}
      data-testid={`status-pill-${status}`}
      role="status"
      aria-label={`Status: ${meta.label}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />}
      <span>{meta.label}</span>
    </span>
  );
};
