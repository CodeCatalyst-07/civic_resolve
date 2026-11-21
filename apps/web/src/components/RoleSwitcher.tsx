import * as React from 'react';
import { User, ShieldCheck } from 'lucide-react';
import type { Role } from '@civicresolve/shared';
import { Button } from './ui/button.js';

interface RoleSwitcherProps {
  currentRole: Role;
  onRoleChange: (newRole: Role) => void;
}

/**
 * Accessible role switcher allowing hackathon evaluators to toggle between Citizen and Authority views.
 * Preserved in React state only (never written to localStorage).
 */
export function RoleSwitcher({
  currentRole,
  onRoleChange,
}: RoleSwitcherProps): React.JSX.Element {
  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-page p-1"
      role="group"
      aria-label="Role selector"
    >
      <Button
        type="button"
        variant={currentRole === 'citizen' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onRoleChange('citizen')}
        aria-pressed={currentRole === 'citizen'}
        className="gap-1.5 text-xs font-medium"
      >
        <User className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Citizen</span>
      </Button>

      <Button
        type="button"
        variant={currentRole === 'authority' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onRoleChange('authority')}
        aria-pressed={currentRole === 'authority'}
        className="gap-1.5 text-xs font-medium"
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Authority</span>
      </Button>
    </div>
  );
}
