import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient.js';
import { RoleProvider } from '../hooks/useRole.js';
import { Layout } from './Layout.js';
import { Skeleton } from '../components/Skeleton.js';

// Route-level code splitting with React.lazy
const HomePage = lazy(() =>
  import('./pages/HomePage.js').then((m) => ({ default: m.HomePage }))
);
const ReportPage = lazy(() =>
  import('./pages/ReportPage.js').then((m) => ({ default: m.ReportPage }))
);
const TrackPage = lazy(() =>
  import('./pages/TrackPage.js').then((m) => ({ default: m.TrackPage }))
);
const AuthorityPage = lazy(() =>
  import('./pages/AuthorityPage.js').then((m) => ({ default: m.AuthorityPage }))
);

function PageLoadingFallback(): React.JSX.Element {
  return (
    <div className="max-w-2xl mx-auto py-12 space-y-4" role="status" aria-label="Loading page">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

/**
 * Root Application component configuring QueryClient, RoleProvider, and client-side routing.
 */
export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route
                index
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <HomePage />
                  </Suspense>
                }
              />
              <Route
                path="report"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <ReportPage />
                  </Suspense>
                }
              />
              <Route
                path="track"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <TrackPage />
                  </Suspense>
                }
              />
              <Route
                path="track/:id"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <TrackPage />
                  </Suspense>
                }
              />
              <Route
                path="authority"
                element={
                  <Suspense fallback={<PageLoadingFallback />}>
                    <AuthorityPage />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </QueryClientProvider>
  );
}
