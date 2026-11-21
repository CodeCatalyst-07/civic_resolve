import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';

/**
 * Grievance tracking lookup page placeholder.
 */
export function TrackPage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Resolution Tracking</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Track Grievances
        </h1>
        <p className="text-sm text-slate-600">
          Civic grievance tracking and status lookup coming in a later phase.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Citizens can look up submitted reports by ticket ID and monitor state transitions from
            Submitted through Resolved and Closed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
