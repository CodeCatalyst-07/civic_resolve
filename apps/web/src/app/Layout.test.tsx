import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './Layout.js';

function renderShell(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div>Test Home Content</div>} />
          <Route path="authority" element={<div>Test Authority Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Application Shell & Accessibility Landmarks', () => {
  it('renders all required semantic landmarks: header, nav, main, footer', () => {
    renderShell();

    expect(screen.getByRole('banner')).toBeInTheDocument(); // <header>
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument(); // <nav>
    expect(screen.getByRole('main')).toBeInTheDocument(); // <main>
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // <footer>
  });

  it('renders skip link as the first focusable element', async () => {
    renderShell();

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    // Simulate keyboard tab from top of document
    await userEvent.tab();
    expect(skipLink).toHaveFocus();
  });

  it('displays the DemoBanner with role="note"', () => {
    renderShell();

    const banner = screen.getByRole('note', { name: /demo mode notice/i });
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/demo mode: roles are not authenticated/i);
  });

  it('allows toggling between Citizen and Authority roles via RoleSwitcher', async () => {
    renderShell();

    const citizenBtn = screen.getByRole('button', { name: /citizen/i });
    const authorityBtn = screen.getByRole('button', { name: /authority/i });

    // Initial state: Citizen role is active
    expect(citizenBtn).toHaveAttribute('aria-pressed', 'true');
    expect(authorityBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('link', { name: /report issue/i })).toBeInTheDocument();

    // Switch to Authority
    await userEvent.click(authorityBtn);

    expect(authorityBtn).toHaveAttribute('aria-pressed', 'true');
    expect(citizenBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('link', { name: /triage queue/i })).toBeInTheDocument();

    // Switch back to Citizen
    await userEvent.click(citizenBtn);
    expect(citizenBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: /report issue/i })).toBeInTheDocument();
  });
});
