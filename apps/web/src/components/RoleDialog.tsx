import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Role } from '@civicresolve/shared';
import { ShieldCheck, User, X, Key } from 'lucide-react';
import { useRole } from '../hooks/useRole.js';

export interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RoleDialog: React.FC<RoleDialogProps> = ({ open, onOpenChange }) => {
  const { role, authorityCode, setRole, setAuthorityCode } = useRole();
  const [selectedRole, setSelectedRole] = useState<Role>(role);
  const [code, setCode] = useState<string>(authorityCode);

  // Sync state whenever modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedRole(role);
      setCode(authorityCode);
    }
  }, [open, role, authorityCode]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setRole(selectedRole);
    if (selectedRole === Role.AUTHORITY) {
      setAuthorityCode(code.trim());
    }
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-xl border border-border focus:outline-none"
          aria-describedby="role-dialog-description"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <Dialog.Title className="text-base font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
              Demo Mode Role Switcher
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-400 hover:text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <p id="role-dialog-description" className="mt-3 text-xs text-slate-500 leading-relaxed">
            Switch between public Citizen view and Authority / Municipal Officer view for hackathon evaluation.
          </p>

          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-ink" id="role-select-label">Select System Role</span>
              <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="role-select-label">
                <button
                  type="button"
                  onClick={() => setSelectedRole(Role.CITIZEN)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                    selectedRole === Role.CITIZEN
                      ? 'border-primary bg-blue-50/50 text-primary font-semibold'
                      : 'border-border bg-surface text-ink hover:bg-page'
                  }`}
                  aria-pressed={selectedRole === Role.CITIZEN}
                >
                  <User className="w-5 h-5 mb-1" aria-hidden="true" />
                  <span className="text-sm">Citizen</span>
                  <span className="text-[10px] text-slate-500 font-normal">Public portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole(Role.AUTHORITY)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 text-center transition-all ${
                    selectedRole === Role.AUTHORITY
                      ? 'border-primary bg-blue-50/50 text-primary font-semibold'
                      : 'border-border bg-surface text-ink hover:bg-page'
                  }`}
                  aria-pressed={selectedRole === Role.AUTHORITY}
                >
                  <ShieldCheck className="w-5 h-5 mb-1" aria-hidden="true" />
                  <span className="text-sm">Authority</span>
                  <span className="text-[10px] text-slate-500 font-normal">Municipal staff</span>
                </button>
              </div>
            </div>

            {selectedRole === Role.AUTHORITY && (
              <div className="space-y-1.5 p-3 rounded-lg bg-page border border-border">
                <label htmlFor="auth-code-input" className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  Authority Access Code
                </label>
                <input
                  id="auth-code-input"
                  type="password"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter authority access code"
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-slate-500 bg-surface text-ink placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-primary"
                  required
                />
                <p className="text-[10px] text-slate-500">
                  Enter the access code configured in your server environment.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded-md bg-primary text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-primary"
              >
                Apply Role
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
