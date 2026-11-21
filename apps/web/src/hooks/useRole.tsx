import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { Role } from '@civicresolve/shared';

export interface RoleContextValue {
  role: Role;
  authorityCode: string;
  setRole: (role: Role) => void;
  setAuthorityCode: (code: string) => void;
  isAuthority: boolean;
}

export const RoleContext = createContext<RoleContextValue | undefined>(undefined);

const ROLE_STORAGE_KEY = 'civicresolve_role';
const CODE_STORAGE_KEY = 'civicresolve_auth_code';
const DEFAULT_AUTH_CODE = 'secret-authority-pass-99';

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<Role>(() => {
    try {
      const stored = localStorage.getItem(ROLE_STORAGE_KEY);
      return stored === Role.AUTHORITY ? Role.AUTHORITY : Role.CITIZEN;
    } catch {
      return Role.CITIZEN;
    }
  });

  const [authorityCode, setAuthorityCodeState] = useState<string>(() => {
    try {
      return localStorage.getItem(CODE_STORAGE_KEY) || DEFAULT_AUTH_CODE;
    } catch {
      return DEFAULT_AUTH_CODE;
    }
  });

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    try {
      localStorage.setItem(ROLE_STORAGE_KEY, newRole);
    } catch {
      // localStorage may be unavailable in restricted modes
    }
  };

  const setAuthorityCode = (code: string) => {
    setAuthorityCodeState(code);
    try {
      localStorage.setItem(CODE_STORAGE_KEY, code);
    } catch {
      // ignore
    }
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
      authorityCode: DEFAULT_AUTH_CODE,
      setRole: () => {},
      setAuthorityCode: () => {},
      isAuthority: false,
    };
  }
  return ctx;
}
