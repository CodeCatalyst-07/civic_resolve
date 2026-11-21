import * as React from 'react';

/**
 * Accessible skip navigation link positioned as the first focusable element on the page.
 */
export function SkipLink(): React.JSX.Element {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-subtle focus:ring-2 focus:ring-white focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
