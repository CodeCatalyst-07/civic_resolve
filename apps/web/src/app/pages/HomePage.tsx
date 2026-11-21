import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card.js';
import { Badge } from '../../components/ui/badge.js';
import { FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button.js';

/**
 * Citizen home page placeholder.
 */
export function HomePage(): React.JSX.Element {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Citizen Portal</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Citizen Grievance Portal
        </h1>
        <p className="text-sm text-slate-600">
          Citizen grievance reporting and overview coming in a later phase.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
              <CardTitle>Submit a Report</CardTitle>
            </div>
            <CardDescription>
              Report potholes, waste, water leakage, or hazards directly to municipal authorities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="gap-2">
              <Link to="/report">
                Go to Report Form <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" aria-hidden="true" />
              <CardTitle>Track Status</CardTitle>
            </div>
            <CardDescription>
              Follow resolution progress and view municipal actions for existing tickets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/track">
                Track Existing Report <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
