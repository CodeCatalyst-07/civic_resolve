import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthorityPage } from './AuthorityPage.js';
import * as roleHook from '../../hooks/useRole.js';
import { Role } from '@civicresolve/shared';
import * as apiClientModule from '../../lib/apiClient.js';

describe('AuthorityPage & Gate Verification', () => {
  let queryClient: QueryClient;
  const mockGetQueue = vi.fn().mockResolvedValue({ tickets: [], next_cursor: undefined });
  const mockGetStats = vi.fn().mockResolvedValue({
    open: 5,
    resolved: 10,
    critical_open: 1,
    overdue: 0,
    median_resolution_hours: 12,
    resolved_last_7_days: 7,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    apiClientModule.setApiClient({
      getAuthorityQueue: mockGetQueue,
      getStats: mockGetStats,
      getWards: vi.fn().mockResolvedValue([]),
      getMeta: vi.fn().mockResolvedValue({
        categories: [],
        urgencies: [],
        statuses: [],
        roles: [],
        departments: [],
        slaHours: {},
        status_transitions: {},
      }),
    } as unknown as apiClientModule.ApiClient);
  });

  it('renders access gate card with explanation when current role is Citizen and makes zero authority API calls', () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      role: Role.CITIZEN,
      authorityCode: '',
      setRole: vi.fn(),
      setAuthorityCode: vi.fn(),
      isAuthority: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthorityPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('authority-gate-card')).toBeInTheDocument();
    expect(screen.getByText(/authority portal access gate/i)).toBeInTheDocument();
    expect(screen.getByText(/switch role or enter access code/i)).toBeInTheDocument();
    expect(screen.getByText(/return to citizen portal/i)).toBeInTheDocument();

    // Verify ZERO authority API calls dispatched
    expect(mockGetQueue).not.toHaveBeenCalled();
  });

  it('renders authorized work queue view when current role is Authority', async () => {
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      role: Role.AUTHORITY,
      authorityCode: 'test-authority-code',
      setRole: vi.fn(),
      setAuthorityCode: vi.fn(),
      isAuthority: true,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthorityPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText(/authority & engineering dashboard/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /operational metrics/i })).toBeInTheDocument();
    expect(screen.getByRole('search', { name: /queue filter controls/i })).toBeInTheDocument();
  });

  it('opens RoleDialog when user clicks switch role button in gate card', async () => {
    const user = userEvent.setup();
    vi.spyOn(roleHook, 'useRole').mockReturnValue({
      role: Role.CITIZEN,
      authorityCode: '',
      setRole: vi.fn(),
      setAuthorityCode: vi.fn(),
      isAuthority: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthorityPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const switchBtn = screen.getByRole('button', { name: /switch role or enter access code/i });
    await user.click(switchBtn);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/demo mode role switcher/i)).toBeInTheDocument();
  });
});
