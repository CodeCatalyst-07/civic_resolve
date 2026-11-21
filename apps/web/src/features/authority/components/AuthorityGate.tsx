import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, KeyRound, Lock } from 'lucide-react';
import { STRINGS } from '../../../content/strings.js';
import { RoleDialog } from '../../../components/RoleDialog.js';

export const AuthorityGate: React.FC = () => {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  return (
    <div
      className="p-6 md:p-8 bg-surface border border-slate-300 rounded-xl shadow-subtle space-y-6 max-w-2xl mx-auto my-12"
      data-testid="authority-gate-card"
    >
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-800 flex-shrink-0 mt-0.5">
          <Lock className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-ink tracking-tight">
            {STRINGS.authority.placeholderHeader}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            This dashboard requires the <strong>Authority</strong> role with a valid municipal access code.
            Your current active role is set to <span className="font-semibold text-primary">Citizen</span>.
          </p>
        </div>
      </div>

      <div className="p-4 bg-page rounded-lg border border-border text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span className="font-semibold text-ink">Municipal Evaluator Notice:</span>
        </div>
        <p className="leading-relaxed">
          To test the municipal engineering workflow, switch your role using the button below and provide
          your evaluator authority access code (configured in your local environment as <code>DEMO_AUTHORITY_CODE</code>).
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          to="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border border-slate-500 text-ink hover:bg-page transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{STRINGS.authority.backToCitizen}</span>
        </Link>
        <button
          type="button"
          onClick={() => setRoleDialogOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-primary text-white hover:bg-blue-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ShieldAlert className="w-4 h-4" aria-hidden="true" />
          <span>{STRINGS.authority.switchRoleButton}</span>
        </button>
      </div>

      <RoleDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
    </div>
  );
};
