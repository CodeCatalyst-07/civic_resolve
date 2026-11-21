import * as React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { Role } from '@civicresolve/shared';
import { SkipLink } from '../components/SkipLink.js';
import { DemoBanner } from '../components/DemoBanner.js';
import { RoleSwitcher } from '../components/RoleSwitcher.js';
import { Building2 } from 'lucide-react';
import { cn } from '../lib/utils.js';

interface LayoutProps {
  initialRole?: Role;
}

/**
 * Primary accessible application shell providing landmarks, navigation, and role switching.
 */
export function Layout({ initialRole = 'citizen' }: LayoutProps): React.JSX.Element {
  const [currentRole, setCurrentRole] = React.useState<Role>(initialRole);
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleChange = React.useCallback(
    (newRole: Role) => {
      setCurrentRole(newRole);
      // Convenience auto-navigation on explicit role switch
      if (newRole === 'authority' && !location.pathname.startsWith('/authority')) {
        navigate('/authority');
      } else if (newRole === 'citizen' && location.pathname.startsWith('/authority')) {
        navigate('/');
      }
    },
    [location.pathname, navigate]
  );

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink antialiased">
      <SkipLink />
      <DemoBanner />

      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm">
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

          <div className="flex items-center gap-3">
            <RoleSwitcher currentRole={currentRole} onRoleChange={handleRoleChange} />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 outline-none">
        <Outlet />
      </main>

      <footer className="border-t border-border bg-surface py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p>CivicResolve — AI-Assisted Civic Grievance Management.</p>
          <p className="mt-1">
            Built for Google Hackathon demonstration. Follows strict accessibility and security standards.
          </p>
        </div>
      </footer>
    </div>
  );
}
