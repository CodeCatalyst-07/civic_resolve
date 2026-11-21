import React from 'react';
import type { Category } from '@civicresolve/shared';
import { CATEGORY_LABELS } from '../content/labels.js';

export interface CategoryChipProps {
  category: Category;
  className?: string;
  showIcon?: boolean;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({
  category,
  className = '',
  showIcon = true,
}) => {
  const meta = CATEGORY_LABELS[category] || CATEGORY_LABELS.other_civic;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-page border border-border text-ink ${className}`}
      data-testid={`category-chip-${category}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" aria-hidden="true" />}
      <span>{meta.label}</span>
    </span>
  );
};
