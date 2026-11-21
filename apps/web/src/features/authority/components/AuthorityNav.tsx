import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutList, MapPin } from 'lucide-react';
import { STRINGS } from '../../../content/strings.js';

export const AuthorityNav: React.FC = () => {
  const hasMapsKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY);

  return (
    <nav
      className="border-b border-border mb-6"
      aria-label="Authority sub-navigation"
    >
      <div className="flex items-center gap-6">
        <NavLink
          to="/authority"
          end
          className={({ isActive }) =>
            `inline-flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-slate-600 hover:text-ink hover:border-slate-300'
            }`
          }
        >
          <LayoutList className="w-4 h-4" aria-hidden="true" />
          <span>{STRINGS.authority.navQueue}</span>
        </NavLink>

        {hasMapsKey && (
          <NavLink
            to="/authority/map"
            className={({ isActive }) =>
              `inline-flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-slate-600 hover:text-ink hover:border-slate-300'
              }`
            }
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
            <span>{STRINGS.authority.navMap}</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
};
