import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider } from '../../hooks/useRole.js';
import { TrackPage } from './TrackPage.js';
import * as apiClientModule from '../../lib/apiClient.js';
import { Category, Urgency, Status, Role, type PublicTicketView } from '@civicresolve/shared';

describe('TrackPage', () => {
  const mockClient = {
    getTicket: vi.fn(),
    supportTicket: vi.fn(),
    reopenTicket: vi.fn(),
  };

  const sampleTicket: PublicTicketView = {
    id: 'CR-7X2K9M4P',
    status: Status.RESOLVED,
    category: Category.POTHOLE,
    urgency: Urgency.HIGH,
    department: 'Roads & Infrastructure',
    summary: 'Pothole on 100ft road Indiranagar',
    ward: 'Ward 12',
    created_at: '2026-11-20T10:00:00.000Z',
    due_at: '2026-11-22T10:00:00.000Z',
    overdue: true,
    duplicate_count: 5,
    reasons: ['Skid hazard'],
    applied_rules: [
      {
        id: 'R3_LOCATION_BOOST',
        label: 'Sensitive Location Proximity',
        effect: 'Boosted to High',
      },
    ],
    timeline: [
      {
        id: 'evt-1',
        status: Status.SUBMITTED,
        role: Role.CITIZEN,
        note: 'Reported by citizen',
        at: '2026-11-20T10:00:00.000Z',
      },
      {
        id: 'evt-2',
        status: Status.RESOLVED,
        role: Role.AUTHORITY,
        note: 'Road patch asphalt applied',
        at: '2026-11-21T15:00:00.000Z',
      },
    ],
    emergency_notice: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClientModule.setApiClient(mockClient as unknown as apiClientModule.ApiClient);
  });

  const renderTrack = (initialPath = '/track') => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <RoleProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="track" element={<TrackPage />} />
              <Route path="track/:id" element={<TrackPage />} />
            </Routes>
          </MemoryRouter>
        </RoleProvider>
      </QueryClientProvider>
    );
  };

  it('renders lookup form on /track without ID', () => {
    renderTrack('/track');
    expect(screen.getByPlaceholderText(/enter 8-character ID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lookup/i })).toBeInTheDocument();
  });

  it('rejects invalid ticket ID format in url with friendly error message', () => {
    renderTrack('/track/INVALID');
    expect(screen.getByText(/invalid ticket reference/i)).toBeInTheDocument();
  });

  it('displays ticket not found when API returns 404', async () => {
    mockClient.getTicket.mockRejectedValueOnce({
      status: 404,
      message: 'Ticket not found',
    });

    renderTrack('/track/CR-00000000');

    await waitFor(() => {
      expect(screen.getByText(/ticket not found/i)).toBeInTheDocument();
      expect(screen.getByText(/no grievance registered with ID "CR-00000000"/i)).toBeInTheDocument();
    });
  });

  it('renders complete public ticket view with overdue warning and timeline', async () => {
    mockClient.getTicket.mockResolvedValueOnce(sampleTicket);

    renderTrack('/track/CR-7X2K9M4P');

    await waitFor(() => {
      expect(screen.getByText('CR-7X2K9M4P')).toBeInTheDocument();
      expect(screen.getByText(/pothole on 100ft road indiranagar/i)).toBeInTheDocument();
      expect(screen.getByText(/sla escalated/i)).toBeInTheDocument();
      expect(screen.getByText(/emergency notice/i)).toBeInTheDocument();
      expect(screen.getByText(/road patch asphalt applied/i)).toBeInTheDocument();
      expect(screen.getByText(/5/)).toBeInTheDocument(); // duplicate count
    });
  });

  it('allows citizen to reopen a resolved ticket with explanatory note', async () => {
    const user = userEvent.setup();
    mockClient.getTicket.mockResolvedValue(sampleTicket);
    mockClient.reopenTicket.mockResolvedValueOnce({
      ...sampleTicket,
      status: Status.REOPENED,
      timeline: [
        ...sampleTicket.timeline,
        {
          id: 'evt-3',
          status: Status.REOPENED,
          role: Role.CITIZEN,
          note: 'Pothole gravel washed away in rain',
          at: new Date().toISOString(),
        },
      ],
    });

    renderTrack('/track/CR-7X2K9M4P');

    const reopenTrigger = await screen.findByRole('button', { name: /reopen this grievance/i });
    await user.click(reopenTrigger);

    // Modal opens
    const noteInput = await screen.findByLabelText(/reason for reopening/i);
    expect(noteInput).toBeInTheDocument();

    await user.type(noteInput, 'Pothole gravel washed away in rain');
    const submitBtn = screen.getByRole('button', { name: /submit reopening request/i });
    await user.click(submitBtn);

    expect(mockClient.reopenTicket).toHaveBeenCalledWith(
      'CR-7X2K9M4P',
      'Pothole gravel washed away in rain'
    );
  });
});
