import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Role } from '@civicresolve/shared';
import { setMemoryAuth } from '../lib/apiClient.js';

export interface RoleContextValue {
  role: Role;
  authorityCode: string;
  setRole: (role: Role) => void;
  setAuthorityCode: (code: string) => void;
  isAuthority: boolean;
}

export const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const ROLE_STORAGE_KEY = 'civicresolve_role';

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role>(() => {
    try {
      const stored = localStorage.getItem(ROLE_STORAGE_KEY);
      return stored === Role.AUTHORITY ? Role.AUTHORITY : Role.CITIZEN;
    } catch {
      return Role.CITIZEN;
    }
  });

  const [authorityCode, setAuthorityCodeState] = useState<string>('');

  useEffect(() => {
    setMemoryAuth(role, authorityCode);
  }, [role, authorityCode]);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (newRole === Role.CITIZEN) {
      setAuthorityCodeState('');
      setMemoryAuth(Role.CITIZEN, '');
    } else {
      setMemoryAuth(newRole, authorityCode);
    }
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } catch {
      // localStorage may be unavailable in restricted modes
    }
  };

  const setAuthorityCode = (code: string) => {
    setAuthorityCodeState(code);
    setMemoryAuth(role, code);
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        authorityCode,
        setRole,
        setAuthorityCode,
        isAuthority: role === Role.AUTHORITY,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return {
      role: Role.CITIZEN,
      authorityCode: '',
      setRole: () => {},
      setAuthorityCode: () => {},
      isAuthority: false,
    };
  }
  return ctx;
}
