import * as React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { Role } from '@civicresolve/shared';
import { SkipLink } from '../components/SkipLink.js';
import { DemoBanner } from '../components/DemoBanner.js';
import { RoleSwitcher } from '../components/RoleSwitcher.js';
import { RoleDialog } from '../components/RoleDialog.js';
import { Building2, Settings } from 'lucide-react';
import { cn } from '../lib/utils.js';
import { RoleContext } from '../hooks/useRole.js';

interface LayoutProps {
  initialRole?: Role;
}

/**
 * Primary accessible application shell providing landmarks, navigation, and role switching.
 */
export function Layout({ initialRole }: LayoutProps): React.JSX.Element {
  const roleCtx = React.useContext(RoleContext);
  const [localRole, setLocalRole] = React.useState<Role>(initialRole || 'citizen');

  const currentRole = roleCtx ? roleCtx.role : localRole;
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleChange = React.useCallback(
    (newRole: Role) => {
      if (roleCtx) {
        roleCtx.setRole(newRole);
      } else {
        setLocalRole(newRole);
      }

      // Convenience auto-navigation on explicit role switch
      if (newRole === 'authority' && !location.pathname.startsWith('/authority')) {
        navigate('/authority');
      } else if (newRole === 'citizen' && location.pathname.startsWith('/authority')) {
        navigate('/');
      }
    },
    [roleCtx, location.pathname, navigate]
  );

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink antialiased">
      <SkipLink />
      <DemoBanner />

      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm" role="banner">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <NavLink
              to="/"
              className="flex items-center gap-2.5 rounded-md font-semibold text-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-white shadow-subtle">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold leading-tight tracking-tight">CivicResolve</span>
                <span className="text-[11px] font-medium leading-none text-slate-500">
                  Municipal Grievance Portal
                </span>
              </div>
            </NavLink>

            <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
              {currentRole === 'citizen' ? (
                <>
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-page text-primary font-semibold'
                          : 'text-slate-600 hover:bg-page hover:text-ink'
                      )
                    }
                  >
                    Overview
                  </NavLink>
                  <NavLink
                    to="/report"
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-page text-primary font-semibold'
                          : 'text-slate-600 hover:bg-page hover:text-ink'
                      )
                    }
                  >
                    Report Issue
                  </NavLink>
                  <NavLink
                    to="/track"
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-page text-primary font-semibold'
                          : 'text-slate-600 hover:bg-page hover:text-ink'
                      )
                    }
                  >
                    Track Status
                  </NavLink>
                </>
              ) : (
                <NavLink
                  to="/authority"
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-page text-primary font-semibold'
                        : 'text-slate-600 hover:bg-page hover:text-ink'
                    )
                  }
                >
                  Triage Queue
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <RoleSwitcher currentRole={currentRole} onRoleChange={handleRoleChange} />
            <button
              type="button"
              onClick={() => setRoleDialogOpen(true)}
              className="p-1.5 rounded-md text-slate-400 hover:text-ink hover:bg-page transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Demo mode role settings"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 outline-none" role="main">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-slate-500" role="contentinfo">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-1">
          <p className="font-semibold text-ink">CivicResolve — AI-Assisted Civic Grievance Management</p>
          <p>
            Designed to WCAG 2.2 AA with automated contrast and axe checks (no manual screen-reader audit). All municipal dispatches governed by demo target times.
          </p>
          <p className="text-[11px] text-slate-400">
            Demonstration mode for Google Hackathon evaluation.
          </p>
        </div>
      </footer>

      <RoleDialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} />
    </div>
  );
}
