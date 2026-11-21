import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthorityPage } from './AuthorityPage.js';
import * as roleHook from '../../hooks/useRole.js';
import { Role } from '@civicresolve/shared';

describe('AuthorityPage (Phase 2.4 Placeholder Gate)', () => {
  it('renders access gate card with explanation when current role is Citizen', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      role: Role.CITIZEN,
      authorityCode: 'secret-authority-pass-99',
      setRole: vi.fn(),
      setAuthorityCode: vi.fn(),
      isAuthority: false,
    });

    render(
      <MemoryRouter>
        <AuthorityPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('authority-gate-card')).toBeInTheDocument();
    expect(screen.getByText(/authority portal access gate/i)).toBeInTheDocument();
    expect(screen.getByText(/switch role or enter access code/i)).toBeInTheDocument();
    expect(screen.getByText(/return to citizen portal/i)).toBeInTheDocument();
  });

  it('renders authorized view when current role is Authority', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      role: Role.AUTHORITY,
      authorityCode: 'secret-authority-pass-99',
      setRole: vi.fn(),
      setAuthorityCode: vi.fn(),
      isAuthority: true,
    });

    render(
      <MemoryRouter>
        <AuthorityPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('authority-authorized-view')).toBeInTheDocument();
    expect(screen.getByText(/authorized municipal session/i)).toBeInTheDocument();
    expect(screen.getByText(/secret-authority-pass-99/i)).toBeInTheDocument();
  });

  it('opens RoleDialog when user clicks switch role button in gate card', async () => {
    const user = userEvent.setup();
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      role: Role.CITIZEN,
      authorityCode: 'secret-authority-pass-99',
      setRole: vi.fn(),
      setAuthorityCode: vi.fn(),
      isAuthority: false,
    });

    render(
      <MemoryRouter>
        <AuthorityPage />
      </MemoryRouter>
    );

    const switchBtn = screen.getByRole('button', { name: /switch role or enter access code/i });
    await user.click(switchBtn);

    expect(screen.getByText(/demo mode role switcher/i)).toBeInTheDocument();
  });
});
