import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';

/**
 * Report submission page placeholder.
 */
export function ReportPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">New Submission</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Report a Civic Issue
        </h1>
        <p className="text-sm text-slate-600">
          Issue submission form with AI-assisted triage coming in a later phase.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Grievance Intake</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Citizens will describe grievances in plain text with optional location metadata.
            AI triage will parse category and urgency suggestions before final confirmation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
