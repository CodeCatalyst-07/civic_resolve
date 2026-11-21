import { useEffect } from 'react';

/**
 * Updates document.title to standard format "<Page Name> - CivicResolve".
 */
export function usePageTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} - CivicResolve` : 'CivicResolve - Fix Neighborhood Issues';

    return () => {
      document.title = previous;
    };
  }, [title]);
}
