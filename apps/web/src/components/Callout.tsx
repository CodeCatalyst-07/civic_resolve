import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, PhoneCall } from 'lucide-react';

export type CalloutVariant = 'info' | 'warning' | 'danger' | 'success' | 'emergency';

export interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  icon?: boolean;
}

const variantStyles: Record<
  CalloutVariant,
  { container: string; text: string; title: string; defaultIcon: React.ElementType }
> = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-900',
    text: 'text-blue-800',
    title: 'text-blue-950 font-semibold',
    defaultIcon: Info,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    text: 'text-amber-800',
    title: 'text-amber-950 font-semibold',
    defaultIcon: AlertTriangle,
  },
  danger: {
    container: 'bg-red-50 border-red-200 text-red-900',
    text: 'text-red-800',
    title: 'text-red-950 font-semibold',
    defaultIcon: AlertCircle,
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    text: 'text-emerald-800',
    title: 'text-emerald-950 font-semibold',
    defaultIcon: CheckCircle2,
  },
  emergency: {
    container: 'bg-red-100 border-red-300 text-red-950 ring-2 ring-red-400',
    text: 'text-red-900 font-medium',
    title: 'text-red-950 font-bold flex items-center gap-2',
    defaultIcon: PhoneCall,
  },
};

export const Callout: React.FC<CalloutProps> = ({
  variant = 'info',
  title,
  children,
  className = '',
  icon = true,
}) => {
  const styles = variantStyles[variant];
  const IconComponent = styles.defaultIcon;
  const isAlert = variant === 'emergency' || variant === 'danger';

  return (
    <div
      role={isAlert ? 'alert' : 'region'}
      aria-label={isAlert ? undefined : title || `${variant} notice`}
      className={`p-4 rounded-lg border flex gap-3 text-sm leading-relaxed ${styles.container} ${className}`}
      data-testid={`callout-${variant}`}
    >
      {icon && (
        <div className="flex-shrink-0 mt-0.5">
          <IconComponent className="w-5 h-5" aria-hidden="true" />
        </div>
      )}
      <div className="flex-1 space-y-1">
        {title && <h3 className={styles.title}>{title}</h3>}
        <div className={styles.text}>{children}</div>
      </div>
    </div>
  );
};
