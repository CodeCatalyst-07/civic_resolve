import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-accent text-accent-foreground',
        outline: 'border-border text-ink bg-surface',
        critical: 'border-transparent bg-red-100 text-urgency-critical border-urgency-critical/20',
        high: 'border-transparent bg-orange-100 text-urgency-high border-urgency-high/20',
        medium: 'border-transparent bg-amber-100 text-urgency-medium border-urgency-medium/20',
        low: 'border-transparent bg-slate-100 text-urgency-low border-urgency-low/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
