import * as React from 'react';
import { Info } from 'lucide-react';

/**
 * Prominent banner indicating demo staff view protected by demo code.
 */
export function DemoBanner(): React.JSX.Element {
  return (
    <div
      role="note"
      aria-label="Demo mode notice"
      className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900"
    >
      <Info className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
      <span>Demo mode: staff view protected by demo access code</span>
    </div>
  );
}
