import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../../hooks/useRole.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { STRINGS } from '../../content/strings.js';
import { RoleDialog } from '../../components/RoleDialog.js';
import { ShieldCheck, ShieldAlert, Key, ArrowLeft } from 'lucide-react';

export function AuthorityPage(): React.JSX.Element {
  usePageTitle('Authority Portal');
  const { authorityCode, isAuthority } = useRole();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="authority-page">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Municipal Operations Gate</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          {STRINGS.authority.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          {STRINGS.authority.placeholderNotice}
        </p>
      </div>

      {!isAuthority ? (
        /* Access Gate Card for Citizen Role */
        <div className="p-6 bg-surface border border-amber-300 rounded-xl shadow-subtle space-y-4" data-testid="authority-gate-card">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold text-ink">
                {STRINGS.authority.placeholderHeader}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                This dashboard requires the <strong>Authority</strong> role with a valid municipal access code.
                Your current role is set to <span className="font-semibold text-primary">Citizen</span>.
              </p>
            </div>
          </div>

          <div className="p-4 bg-page rounded-lg border border-border text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span className="font-semibold text-ink">Hackathon Evaluator Notice:</span>
            </div>
            <p className="leading-relaxed">
              To test the Authority workflow, switch your role using the button below. The pre-configured demo access code is{' '}
              <code className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-ink font-semibold">
                secret-authority-pass-99
              </code>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-border text-ink hover:bg-page transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>{STRINGS.authority.backToCitizen}</span>
            </Link>

            <button
              type="button"
              onClick={() => setRoleDialogOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>{STRINGS.authority.switchRoleButton}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Authorized Authority Placeholder */
        <div className="p-6 bg-surface border border-emerald-300 rounded-xl shadow-subtle space-y-5" data-testid="authority-authorized-view">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide block">
                  Authorized Municipal Session
                </span>
                <span className="text-sm font-semibold text-ink">
                  Role: Municipal Authority Officer
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRoleDialogOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-page transition-colors text-slate-700 focus-visible:outline-2 focus-visible:outline-primary"
            >
              Switch Role
            </button>
          </div>

          <div className="p-4 bg-page rounded-lg border border-border space-y-2 text-xs text-slate-600">
            <span className="font-semibold text-ink block">Phase 2.5 Roadmap:</span>
            <p className="leading-relaxed">
              The full Authority Dashboard will be delivered in <strong>Phase 2.5</strong>. It will feature:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>Live SLA-sorted triage queue with ward and department filters</li>
              <li>Emergency hazard alerts and rapid dispatch assignment</li>
              <li>Urgency and category overrides with mandatory audit reasons</li>
              <li>Status updates (In Progress, Resolved with note, Closed, Rejected)</li>
            </ul>
          </div>

          <div className="text-xs text-slate-500 pt-1 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span>Active Demo Header: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-ink">{authorityCode}</code></span>
          </div>
        </div>
      )}

      {/* Role Dialog */}
      <RoleDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
    </div>
  );
}
