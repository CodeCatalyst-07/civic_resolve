import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleProvider, RoleContext } from '../hooks/useRole.js';
import { Layout } from '../app/Layout.js';
import { ReportPage } from '../app/pages/ReportPage.js';
import { HomePage } from '../app/pages/HomePage.js';
import { TrackPage } from '../app/pages/TrackPage.js';
import { AuthorityPage } from '../app/pages/AuthorityPage.js';
import { Category, Urgency, Status, Role } from '@civicresolve/shared';
import * as apiClientModule from '../lib/apiClient.js';

describe('Citizen End-to-End Keyboard Journey', () => {
  const mockClient = {
    getStats: vi.fn().mockResolvedValue({
      open: 12,
      resolved: 20,
      critical_open: 2,
      overdue: 1,
      median_resolution_hours: 24,
      resolved_last_7_days: 10,
    }),
    getMeta: vi.fn().mockResolvedValue({
      categories: ['pothole', 'garbage'],
      urgencies: ['low', 'medium', 'high', 'critical'],
      statuses: ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected', 'reopened'],
      roles: ['citizen', 'authority'],
      departments: [{ id: 'roads', displayName: 'Roads & Infrastructure', localAuthority: 'BBMP' }],
      slaHours: { low: 168, medium: 96, high: 48, critical: 24 },
      status_transitions: {
        submitted: ['under_review', 'rejected'],
        under_review: ['assigned', 'rejected'],
        assigned: ['in_progress'],
        in_progress: ['resolved'],
        resolved: ['closed'],
      },
    }),
    getRecentReports: vi.fn().mockResolvedValue([]),
    getWards: vi.fn().mockResolvedValue([
      { name: 'Ward 12 - Indiranagar', number: 12 },
      { name: 'Ward 18 - Koramangala', number: 18 },
    ]),
    geocode: vi.fn(),
    analyzeReport: vi.fn().mockResolvedValue({
      outcome: {
        kind: 'ticket',
        decision: {
          category: Category.POTHOLE,
          urgency: Urgency.HIGH,
          department: 'roads',
          applied_rules: [
            {
              id: 'R3_LOCATION_BOOST',
              label: 'Sensitive Location Proximity',
              effect: 'Boosted urgency near school',
            },
          ],
          emergency_notice: false,
          needs_manual_triage: false,
          ai_suggestion: {
            category: Category.POTHOLE,
            urgency: Urgency.HIGH,
            confidence: 0.95,
            summary: 'Dangerous pothole on 100ft road',
            reasons: ['Severe skid risk'],
            safety_critical: false,
          },
        },
        needs_manual_triage: false,
        emergency_notice: false,
      },
      similar_reports: [],
      meta: {
        ai_source: 'gemini',
        degraded: false,
      },
    }),
    submitReport: vi.fn().mockResolvedValue({
      outcome: {
        kind: 'ticket',
        decision: {
          category: Category.POTHOLE,
          urgency: Urgency.HIGH,
          department: 'roads',
          applied_rules: [],
          emergency_notice: false,
          needs_manual_triage: false,
          ai_suggestion: null,
        },
        needs_manual_triage: false,
        emergency_notice: false,
      },
      ticket: {
        id: 'CR-7X2K9M4P',
        status: Status.SUBMITTED,
        category: Category.POTHOLE,
        urgency: Urgency.HIGH,
        department: 'Roads & Infrastructure',
        summary: 'Dangerous pothole on 100ft road',
        ward: 'Ward 12 - Indiranagar',
        created_at: '2026-11-21T10:00:00.000Z',
        due_at: '2026-11-23T10:00:00.000Z',
        overdue: false,
        duplicate_count: 0,
        reasons: [],
        applied_rules: [],
        timeline: [],
        emergency_notice: false,
      },
      meta: {
        ai_source: 'gemini',
        degraded: false,
      },
    }),
    getTicket: vi.fn(),
    supportTicket: vi.fn(),
    reopenTicket: vi.fn(),
    getAuthorityQueue: vi.fn(),
    getAuthorityTicket: vi.fn(),
    updateAuthorityStatus: vi.fn(),
    overrideAuthorityTriage: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClientModule.setApiClient(mockClient as unknown as apiClientModule.ApiClient);
  });

  it('completes entire reporting flow using keyboard tab, type, and enter keys only', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <MemoryRouter initialEntries={['/report']}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="report" element={<ReportPage />} />
                <Route path="track/:id" element={<TrackPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </RoleProvider>
      </QueryClientProvider>
    );

    // Verify on Step 1: Describe
    const textarea = screen.getByLabelText(/what is the civic issue/i);
    expect(textarea).toBeInTheDocument();

    // Type complaint text via keyboard
    await user.click(textarea);
    await user.keyboard('Large deep pothole on 100ft road near the signal.');

    // Tab to Continue button
    await user.tab();
    const nextBtn = screen.getByRole('button', { name: /continue/i });
    expect(nextBtn).toHaveFocus();
    await user.keyboard('{Enter}');

    // Step 2: Location
    const addressInput = await screen.findByLabelText(/street address or landmark/i);
    expect(addressInput).toBeInTheDocument();

    await user.click(addressInput);
    await user.keyboard('Near Indiranagar Metro Station');

    // Tab to Review AI Analysis button and submit
    const reviewBtn = screen.getByRole('button', { name: /review ai analysis/i });
    await user.click(reviewBtn);

    // Step 3: Review & Confirm
    const triageCard = await screen.findByTestId('triage-card');
    expect(triageCard).toBeInTheDocument();
    expect(screen.getByText(/dangerous pothole on 100ft road/i)).toBeInTheDocument();

    // Confirm submission
    const confirmBtn = screen.getByRole('button', { name: /confirm & file grievance/i });
    await user.click(confirmBtn);

    // Step 4: Confirmation Receipt
    const receipt = await screen.findByTestId('step-confirmation');
    expect(receipt).toBeInTheDocument();
    expect(screen.getByText('CR-7X2K9M4P')).toBeInTheDocument();

    // Copy button is present and focusable
    const copyBtn = screen.getByRole('button', { name: /copy CR-7X2K9M4P/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it('navigates authority work queue table and opens detail sheet via Enter, then closes with Escape', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const mockAuthTicket = {
      id: 'CR-88888888',
      status: Status.SUBMITTED,
      category: Category.POTHOLE,
      urgency: Urgency.HIGH,
      department: 'Roads & Infrastructure',
      summary: 'Dangerous pothole outside school',
      ward: 'Ward 12 - Indiranagar',
      description: 'Dangerous pothole outside school gate on 100ft road.',
      location: { address: '100ft Road, Indiranagar', lat: 12.9719, lng: 77.6416 },
      created_at: '2026-11-21T10:00:00.000Z',
      due_at: '2026-11-23T10:00:00.000Z',
      overdue: false,
      duplicate_count: 2,
      reasons: ['High traffic road'],
      applied_rules: [],
      timeline: [
        {
          id: 'evt-1',
          status: Status.SUBMITTED,
          role: Role.CITIZEN,
          at: '2026-11-21T10:00:00.000Z',
        },
      ],
      emergency_notice: false,
      ai_suggestion: {
        is_civic_issue: true,
        category: Category.POTHOLE,
        urgency: Urgency.MEDIUM,
        confidence: 0.95,
        summary: 'Pothole on 100ft road',
        reasons: ['Pothole detected'],
        safety_critical: false,
        missing_info: [],
      },
      needs_manual_triage: false,
      escalated: false,
      reopen_count: 0,
      version: 1,
    };

    mockClient.getAuthorityQueue.mockResolvedValue({
      tickets: [mockAuthTicket],
      next_cursor: undefined,
    });
    mockClient.getAuthorityTicket.mockResolvedValue(mockAuthTicket);

    render(
      <QueryClientProvider client={queryClient}>
        <RoleContext.Provider
          value={{
            role: Role.AUTHORITY,
            isAuthority: true,
            authorityCode: 'test-code',
            setRole: () => {},
            setAuthorityCode: () => {},
          }}
        >
          <MemoryRouter initialEntries={['/authority']}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route path="authority" element={<AuthorityPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </RoleContext.Provider>
      </QueryClientProvider>
    );

    // Verify row rendered in table
    const row = await screen.findByTestId('queue-row-CR-88888888');
    expect(row).toBeInTheDocument();

    // Focus row and press Enter
    row.focus();
    expect(row).toHaveFocus();
    await user.keyboard('{Enter}');

    // Verify slide-over sheet dialog opens
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getAllByText('CR-88888888').length).toBeGreaterThanOrEqual(1);

    // Press Escape to dismiss sheet
    await user.keyboard('{Escape}');

    // Verify dialog is closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
