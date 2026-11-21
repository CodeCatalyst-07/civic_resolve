import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';
import { ShieldCheck } from 'lucide-react';

/**
 * Municipal authority operations dashboard placeholder.
 */
export function AuthorityPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" aria-hidden="true" />
            Authority Operations
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Authority Operations Dashboard
        </h1>
        <p className="text-sm text-slate-600">
          Authority triage queue, department assignment, and status management coming in a later phase.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Priority Triage Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Municipal officials will inspect incoming grievances sorted by rule-derived priority,
            reassign departments, adjust urgency, and perform verified status updates with audit records.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
