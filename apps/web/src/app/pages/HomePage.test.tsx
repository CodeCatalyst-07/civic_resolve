import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider } from '../../hooks/useRole.js';
import { HomePage } from './HomePage.js';
import * as apiClientModule from '../../lib/apiClient.js';
import { Category, Urgency, Status } from '@civicresolve/shared';

describe('HomePage', () => {
  const mockClient = {
    getStats: vi.fn(),
    getRecentReports: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClientModule.setApiClient(mockClient as unknown as apiClientModule.ApiClient);
  });

  const renderHome = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <RoleProvider>
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </RoleProvider>
      </QueryClientProvider>
    );
  };

  it('renders hero title, CTA buttons, and how it works section', () => {
    mockClient.getStats.mockResolvedValueOnce({
      open: 10,
      resolved: 20,
      critical_open: 1,
      overdue: 0,
      median_resolution_hours: 18,
    });
    mockClient.getRecentReports.mockResolvedValueOnce([]);

    renderHome();

    expect(screen.getByRole('heading', { name: /help improve your neighborhood/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /file a new grievance/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /track existing grievance/i })).toBeInTheDocument();
    expect(screen.getByText(/how it works/i)).toBeInTheDocument();
  });

  it('validates ticket code in track box and rejects invalid format', async () => {
    const user = userEvent.setup();
    mockClient.getStats.mockResolvedValueOnce({
      open: 5,
      resolved: 10,
      critical_open: 0,
      overdue: 0,
      median_resolution_hours: 12,
    });
    mockClient.getRecentReports.mockResolvedValueOnce([]);

    renderHome();

    const input = screen.getByPlaceholderText(/e\.g\. CR-7X2K9M4P/i);
    const submitBtn = screen.getByRole('button', { name: /find report/i });

    // Empty submission
    await user.click(submitBtn);
    expect(await screen.findByText(/please enter a ticket code/i)).toBeInTheDocument();

    // Invalid code
    await user.type(input, 'INVALID-CODE');
    await user.click(submitBtn);
    expect(await screen.findByText(/please enter a valid 8-character code/i)).toBeInTheDocument();
  });

  it('displays public stats strip with live values', async () => {
    mockClient.getStats.mockResolvedValue({
      open: 42,
      resolved: 88,
      critical_open: 3,
      overdue: 2,
      median_resolution_hours: 36,
    });
    mockClient.getRecentReports.mockResolvedValue([]);

    renderHome();

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(await screen.findByText('88')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('36h')).toBeInTheDocument();
  });

  it('renders recent community reports', async () => {
    mockClient.getStats.mockResolvedValue({
      open: 1,
      resolved: 1,
      critical_open: 0,
      overdue: 0,
      median_resolution_hours: 24,
    });
    mockClient.getRecentReports.mockResolvedValue([
      {
        id: 'CR-7X2K9M4P',
        category: Category.POTHOLE,
        urgency: Urgency.HIGH,
        status: Status.SUBMITTED,
        summary: 'Pothole on 100ft road Indiranagar',
        duplicate_count: 2,
        created_at: '2026-11-20T10:00:00.000Z',
      },
    ]);

    renderHome();

    await waitFor(() => {
      expect(screen.getByText(/pothole on 100ft road indiranagar/i)).toBeInTheDocument();
      expect(screen.getByText('CR-7X2K9M4P')).toBeInTheDocument();
    });
  });
});
