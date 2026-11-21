import * as React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout.js';
import { HomePage } from './pages/HomePage.js';
import { ReportPage } from './pages/ReportPage.js';
import { TrackPage } from './pages/TrackPage.js';
import { AuthorityPage } from './pages/AuthorityPage.js';

/**
 * Root Application component configuring client-side routing.
 */
export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="track" element={<TrackPage />} />
          <Route path="authority" element={<AuthorityPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
