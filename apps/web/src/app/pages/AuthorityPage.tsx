import React from 'react';
import { useRole } from '../../hooks/useRole.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { AuthorityGate } from '../../features/authority/components/AuthorityGate.js';
import { AuthorityQueuePage } from '../../features/authority/pages/AuthorityQueuePage.js';

export function AuthorityPage(): React.JSX.Element {
  usePageTitle('Authority Work Queue');
  const { isAuthority } = useRole();

  if (!isAuthority) {
    return (
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6" data-testid="authority-page">
        <AuthorityGate />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6" data-testid="authority-page">
      <AuthorityQueuePage />
    </div>
  );
}
