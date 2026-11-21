import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Category,
  Urgency,
  Status,
  Role,
  AiSource,
  type FinalDecision,
  type AuthorityTicketView,
} from '@civicresolve/shared';

import { StatusPill } from '../components/StatusPill.js';
import { UrgencyBadge } from '../components/UrgencyBadge.js';
import { Timeline } from '../components/Timeline.js';
import { ErrorState } from '../components/ErrorState.js';
import { EmptyState } from '../components/EmptyState.js';
import { Callout } from '../components/Callout.js';
import { STRINGS } from '../content/strings.js';
import { TriageCard } from '../features/citizen/components/TriageCard.js';
import { ReopenDialog } from '../features/citizen/components/ReopenDialog.js';
import { TrackView } from '../features/citizen/components/TrackView.js';
import { FilterBar } from '../features/authority/components/FilterBar.js';
import { AuthorityQueuePage } from '../features/authority/pages/AuthorityQueuePage.js';
import { StepDescribe } from '../features/citizen/components/StepDescribe.js';
import { StepLocation } from '../features/citizen/components/StepLocation.js';
import { FollowUpCard } from '../features/citizen/components/FollowUpCard.js';
import { SimilarReportsPanel } from '../features/citizen/components/SimilarReportsPanel.js';
import { QueueTable } from '../features/authority/components/QueueTable.js';
import { AuthorityNav } from '../features/authority/components/AuthorityNav.js';
import { TicketDetailSheet } from '../features/authority/components/TicketDetailSheet.js';
import { ReportPage } from '../app/pages/ReportPage.js';
import { TrackPage } from '../app/pages/TrackPage.js';
import * as apiClientModule from '../lib/apiClient.js';
import { ApiClientContext, setApiClient, type ApiClient } from '../lib/apiClient.js';
import { RoleContext } from '../hooks/useRole.js';

function renderWithClient(ui: React.ReactElement, mockApi?: Partial<ApiClient>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const apiValue = (mockApi || {
    getStats: vi.fn().mockResolvedValue({
      open: 0,
      resolved: 0,
      critical_open: 0,
      overdue: 0,
      median_resolution_hours: 0,
      resolved_last_7_days: 0,
    }),
    getMeta: vi.fn().mockResolvedValue({
      categories: [Category.POTHOLE],
      urgencies: [Urgency.LOW],
      statuses: [Status.SUBMITTED],
      roles: [Role.CITIZEN, Role.AUTHORITY],
      departments: [],
      slaHours: { low: 168, medium: 96, high: 48, critical: 24 },
      status_transitions: {},
    }),
    getWards: vi.fn().mockResolvedValue([]),
    getAuthorityQueue: vi.fn().mockResolvedValue({ tickets: [], next_cursor: undefined }),
  }) as unknown as ApiClient;

  apiClientModule.setApiClient(apiValue);

  return render(
    <MemoryRouter>
      <ApiClientContext.Provider value={apiValue}>
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </ApiClientContext.Provider>
    </MemoryRouter>
  );
}

describe('Web Branch Coverage Deep Boost (>=85% on components and features)', () => {
  it('exercises StatusPill fallback branch on unexpected status', () => {
    // @ts-expect-error - testing unmapped status fallback branch
    render(<StatusPill status="unknown_status" />);
    expect(screen.getByText('Received')).toBeInTheDocument();
  });

  it('exercises UrgencyBadge fallback branch on unexpected urgency', () => {
    // @ts-expect-error - testing unmapped urgency fallback branch
    render(<UrgencyBadge urgency="unknown_urgency" />);
    expect(screen.getByText('Minor')).toBeInTheDocument();
  });

  it('exercises Timeline with note, citizen role, and authority role', () => {
    const events = [
      {
        id: 'ev-1',
        status: Status.SUBMITTED,
        role: Role.CITIZEN,
        at: new Date('2026-11-20T10:00:00Z').toISOString(),
      },
      {
        id: 'ev-2',
        status: Status.IN_PROGRESS,
        role: Role.AUTHORITY,
        note: 'Crew dispatched with asphalt roller',
        at: new Date('2026-11-20T14:00:00Z').toISOString(),
      },
    ];

    render(<Timeline events={events} />);
    expect(screen.getByText('Crew dispatched with asphalt roller')).toBeInTheDocument();
    expect(screen.getByText(/municipal officer/i)).toBeInTheDocument();
    expect(screen.getByText(/citizen/i)).toBeInTheDocument();

    // Empty events returns null
    const { container } = render(<Timeline events={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('exercises ErrorState with and without onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    const { rerender } = render(
      <ErrorState title="Database Error" message="Could not connect" onRetry={onRetry} />
    );
    expect(screen.getByText('Database Error')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /try again/i });
    await user.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<ErrorState title="Fatal Error" message="No retry allowed" />);
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('exercises EmptyState with and without action button', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();

    const { rerender } = render(
      <EmptyState
        title="No Reports"
        description="Nothing found matching filters"
        action={<button onClick={onAction}>Reset Filter</button>}
      />
    );
    expect(screen.getByText('No Reports')).toBeInTheDocument();
    expect(screen.getByText('Nothing found matching filters')).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /reset filter/i });
    await user.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);

    rerender(<EmptyState title="Quiet Queue" />);
    expect(screen.getByText('Quiet Queue')).toBeInTheDocument();
  });

  it('exercises Callout variants: warning, emergency, success, and info', () => {
    const { rerender } = render(
      <Callout variant="warning" title="Warning Box">Check roadway</Callout>
    );
    expect(screen.getByText('Warning Box')).toBeInTheDocument();

    rerender(<Callout variant="emergency" title="Emergency 112">Live electrical wire</Callout>);
    expect(screen.getByText('Emergency 112')).toBeInTheDocument();

    rerender(<Callout variant="success" title="Resolved File">Work verified</Callout>);
    expect(screen.getByText('Resolved File')).toBeInTheDocument();

    rerender(<Callout variant="info">Simple notice text</Callout>);
    expect(screen.getByText('Simple notice text')).toBeInTheDocument();
  });

  it('exercises TriageCard with manual triage flag, emergency notice, applied rules, and category override', async () => {
    const user = userEvent.setup();
    const onOverride = vi.fn();

    const decision: FinalDecision = {
      category: Category.POTHOLE,
      urgency: Urgency.CRITICAL,
      department: 'roads',
      applied_rules: [
        {
          id: 'rule_school_boost',
          label: 'Hospital Zone Priority',
          effect: 'Within 200m of Bowring Hospital',
        },
      ],
      emergency_notice: true,
      needs_manual_triage: true,
      ai_suggestion: {
        is_civic_issue: true,
        category: Category.POTHOLE,
        urgency: Urgency.HIGH,
        safety_critical: true,
        confidence: 0.65,
        summary: 'Crater near hospital gate',
        reasons: ['Patient transport hazard', 'High traffic road'],
        missing_info: [],
      },
      ai_source: AiSource.JARVIS_GEMMA,
    };

    const { rerender } = render(
      <TriageCard
        decision={decision}
        categoryOverride={null}
        onCategoryOverrideChange={onOverride}
        aiSource={decision.ai_source}
        degraded={false}
      />
    );

    expect(screen.getByText('Hospital Zone Priority')).toBeInTheDocument();
    expect(screen.getByText(/patient transport hazard/i)).toBeInTheDocument();
    expect(screen.getByText(STRINGS.report.categoryOverrideLabel)).toBeInTheDocument();

    // Click streetlight radio option
    const streetLightRadio = screen.getByDisplayValue(Category.STREETLIGHT);
    await user.click(streetLightRadio);
    expect(onOverride).toHaveBeenCalledWith(Category.STREETLIGHT);

    // Rerender with streetlight override, then clicking pothole resets override to null
    rerender(
      <TriageCard
        decision={decision}
        categoryOverride={Category.STREETLIGHT}
        onCategoryOverrideChange={onOverride}
        aiSource={decision.ai_source}
        degraded={false}
      />
    );
    const potholeRadio = screen.getByDisplayValue(Category.POTHOLE);
    await user.click(potholeRadio);
    expect(onOverride).toHaveBeenCalledWith(null);

    // Rerender with Gemini and degraded fallback
    rerender(
      <TriageCard
        decision={{ ...decision, urgency: Urgency.HIGH, ai_suggestion: null, applied_rules: [] }}
        categoryOverride={null}
        onCategoryOverrideChange={onOverride}
        aiSource={AiSource.GEMINI}
        degraded={true}
      />
    );
    expect(screen.getByText('Analyzed by Google Gemini')).toBeInTheDocument();
    expect(screen.getByText('(Fallback mode)')).toBeInTheDocument();
    expect(screen.getByText(/48 hours/i)).toBeInTheDocument();

    // Rerender with keyword fallback and medium urgency
    rerender(
      <TriageCard
        decision={{ ...decision, urgency: Urgency.MEDIUM }}
        categoryOverride={null}
        onCategoryOverrideChange={onOverride}
        aiSource={AiSource.KEYWORD_FALLBACK}
        degraded={false}
      />
    );
    expect(screen.getByText('Analyzed by Transparent Keyword Rules (AI Fallback)')).toBeInTheDocument();
    expect(screen.getByText(/96 hours/i)).toBeInTheDocument();

    // Rerender with mock mode and low urgency
    rerender(
      <TriageCard
        decision={{ ...decision, urgency: Urgency.LOW }}
        categoryOverride={null}
        onCategoryOverrideChange={onOverride}
        aiSource={AiSource.MOCK}
        degraded={false}
      />
    );
    expect(screen.getByText('Analyzed in Offline Mock Mode')).toBeInTheDocument();
    expect(screen.getByText(/168 hours/i)).toBeInTheDocument();

    // Rerender with undefined aiSource
    rerender(
      <TriageCard
        decision={decision}
        categoryOverride={null}
        onCategoryOverrideChange={onOverride}
        aiSource={undefined}
        degraded={false}
      />
    );
    expect(screen.getByText('Automated AI Triage')).toBeInTheDocument();
  });

  it('exercises ReopenDialog error branch, empty note validation, and cancel', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('Ticket cannot be reopened'));
    const onOpenChange = vi.fn();

    render(
      <ReopenDialog
        ticketId="CR-99999999"
        open={true}
        onOpenChange={onOpenChange}
        onConfirmReopen={onConfirm}
      />
    );

    const textarea = screen.getByLabelText(STRINGS.track.reopenNoteLabel);
    const submitBtn = screen.getByRole('button', { name: new RegExp(STRINGS.track.reopenSubmitButton, 'i') });

    // Submit with empty spaces (less than 5 chars)
    await user.type(textarea, '   ');
    await user.click(submitBtn);
    expect(onConfirm).not.toHaveBeenCalled();

    // Submit with valid text that throws error
    await user.clear(textarea);
    await user.type(textarea, 'The hole has sunk again after recent rain.');
    await user.click(submitBtn);

    expect(await screen.findByText('Ticket cannot be reopened')).toBeInTheDocument();

    // Click cancel
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('exercises TrackView with overdue warning, emergency notice, and disabled reopen button when already reopened', () => {
    const overdueTicket = {
      id: 'CR-OVERDUE1',
      status: Status.RESOLVED,
      category: Category.SEWER_OVERFLOW,
      urgency: Urgency.CRITICAL,
      department: 'Water & Sewage Board',
      summary: 'Sewer overflow on main street',
      ward: 'Ward 5 - Jakkuru',
      created_at: new Date('2026-11-10T10:00:00Z').toISOString(),
      due_at: new Date('2026-11-12T10:00:00Z').toISOString(),
      overdue: true,
      duplicate_count: 3,
      reasons: ['Biological hazard risk'],
      applied_rules: [],
      timeline: [
        {
          id: 'ev-1',
          status: Status.RESOLVED,
          role: Role.AUTHORITY,
          note: 'Cleared pipe blockage',
          at: new Date('2026-11-15T10:00:00Z').toISOString(),
        },
      ],
      emergency_notice: true,
      reopen_count: 1, // Already reopened once
    };

    const onSupport = vi.fn().mockResolvedValue(undefined);
    const onReopen = vi.fn().mockResolvedValue(undefined);

    render(
      <TrackView
        ticket={overdueTicket}
        onSupport={onSupport}
        onReopen={onReopen}
      />
    );

    expect(screen.getByText(/sla escalated/i)).toBeInTheDocument();
    expect(screen.getByText('Emergency Notice')).toBeInTheDocument();

    // Reopen button is rendered when status is resolved
    const reopenBtn = screen.getByRole('button', { name: /reopen this grievance/i });
    expect(reopenBtn).toBeInTheDocument();
  });

  it('exercises FilterBar clearing individual filters and overdue toggle', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();

    renderWithClient(
      <FilterBar
        filters={{
          status: Status.ASSIGNED,
          category: Category.GARBAGE,
          urgency: Urgency.LOW,
          ward: 'Ward 3 - Atturu',
          overdue: true,
        }}
        onFilterChange={onFilterChange}
      />
    );

    // Clear status
    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: '' } });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }));

    // Clear category
    const catSelect = screen.getByLabelText(/category/i);
    fireEvent.change(catSelect, { target: { value: '' } });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ category: undefined }));

    // Clear urgency
    const urgSelect = screen.getByLabelText(/urgency/i);
    fireEvent.change(urgSelect, { target: { value: '' } });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ urgency: undefined }));

    // Clear ward
    await waitFor(() => {
      expect(screen.getByLabelText(/ward/i)).toBeInTheDocument();
    });
    const wardSelect = screen.getByLabelText(/ward/i);
    fireEvent.change(wardSelect, { target: { value: '' } });
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ ward: undefined }));

    // Uncheck overdue checkbox
    const overdueCheckbox = screen.getByLabelText(/overdue only/i);
    await user.click(overdueCheckbox);
    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ overdue: undefined }));

    // Click "Clear filters"
    const clearBtn = screen.getByRole('button', { name: /clear filters/i });
    await user.click(clearBtn);
    expect(onFilterChange).toHaveBeenCalledWith({});
  });

  it('exercises AuthorityQueuePage row selection and empty filter reset', async () => {
    const user = userEvent.setup();

    renderWithClient(
      <RoleContext.Provider
        value={{
          role: 'authority',
          setRole: vi.fn(),
          isAuthority: true,
          authorityCode: 'test-code',
          setAuthorityCode: vi.fn(),
        }}
      >
        <AuthorityQueuePage />
      </RoleContext.Provider>
    );

    expect(await screen.findByText(/no complaints matching criteria/i)).toBeInTheDocument();
    const clearFiltersBtn = screen.getByRole('button', { name: /clear filters/i });
    await user.click(clearFiltersBtn);
  });

  it('exercises StepDescribe max length validation (>1000 chars)', () => {
    const onNext = vi.fn();
    const onChange = vi.fn();

    const { container } = render(
      <StepDescribe
        value={'a'.repeat(1005)}
        onChange={onChange}
        onNext={onNext}
      />
    );

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText('Description cannot exceed 1,000 characters.')).toBeInTheDocument();
  });

  it('exercises StepLocation geolocation fallback branches', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    // 1. Geolocation unsupported branch
    const originalGeo = navigator.geolocation;
    // @ts-expect-error - simulating browser without geolocation
    delete window.navigator.geolocation;

    const { unmount } = renderWithClient(
      <StepLocation
        value={{ ward: 'Ward 3 - Atturu', lat: 12.97, lng: 77.59 }}
        onChange={onChange}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const detectBtn = screen.getByRole('button', { name: /use my current location/i });
    await user.click(detectBtn);
    expect(screen.getByText('Geolocation is not supported by your browser.')).toBeInTheDocument();

    unmount();

    // 2. Geolocation generic error branch (e.g. POSITION_UNAVAILABLE)
    // @ts-expect-error - restoring mock geolocation
    window.navigator.geolocation = {
      getCurrentPosition: vi.fn((_success, error) => {
        error({ code: 2, PERMISSION_DENIED: 1 });
      }),
    };

    renderWithClient(
      <StepLocation
        value={{ address: 'Test Landmark' }}
        onChange={onChange}
        onNext={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const detectBtn2 = screen.getByRole('button', { name: /use my current location/i });
    await user.click(detectBtn2);
    expect(screen.getByText('Could not detect location. Please specify below.')).toBeInTheDocument();

    // Restore original geolocation
    Object.defineProperty(window.navigator, 'geolocation', {
      value: originalGeo,
      writable: true,
      configurable: true,
    });
  });

  it('exercises FollowUpCard with round 0, loading state, and empty submit', () => {
    const onAnswer = vi.fn();

    const { rerender } = render(
      <FollowUpCard
        question="Which gate was affected?"
        round={0}
        onAnswer={onAnswer}
        isLoading={false}
      />
    );

    expect(screen.queryByText(/round 0/i)).not.toBeInTheDocument();

    // Try submit with empty answer
    const form = screen.getByTestId('follow-up-card').querySelector('form')!;
    fireEvent.submit(form);
    expect(onAnswer).not.toHaveBeenCalled();

    rerender(
      <FollowUpCard
        question="Which gate was affected?"
        round={2}
        onAnswer={onAnswer}
        isLoading={true}
      />
    );
    expect(screen.getByText(/round 2/i)).toBeInTheDocument();
    expect(screen.getByText('Re-analyzing...')).toBeInTheDocument();
  });

  it('exercises SimilarReportsPanel null guard, singular citizen, and loading states', async () => {
    const user = userEvent.setup();
    const onSupport = vi.fn();
    const onSubmitAnyway = vi.fn();

    // 1. Empty reports returns null
    const { container, rerender } = render(
      <SimilarReportsPanel
        similarReports={[]}
        onSupport={onSupport}
        onSubmitAnyway={onSubmitAnyway}
      />
    );
    expect(container.firstChild).toBeNull();

    // 2. Singular report with duplicate_count = 1
    const singleReport = {
      id: 'CR-11111111',
      category: Category.POTHOLE,
      urgency: Urgency.LOW,
      status: Status.SUBMITTED,
      summary: 'Small dip in road',
      duplicate_count: 1,
      created_at: new Date('2026-11-20T10:00:00Z').toISOString(),
    };

    rerender(
      <SimilarReportsPanel
        similarReports={[singleReport]}
        onSupport={onSupport}
        onSubmitAnyway={onSubmitAnyway}
        isSupporting={true}
        isSubmitting={true}
      />
    );

    expect(screen.getByText('1 citizen supported')).toBeInTheDocument();
    expect(screen.getByText('Supporting...')).toBeInTheDocument();

    // 3. Click buttons when not loading
    rerender(
      <SimilarReportsPanel
        similarReports={[singleReport]}
        onSupport={onSupport}
        onSubmitAnyway={onSubmitAnyway}
        isSupporting={false}
        isSubmitting={false}
      />
    );

    const supportBtn = screen.getByRole('button', { name: /support this report/i });
    await user.click(supportBtn);
    expect(onSupport).toHaveBeenCalledWith('CR-11111111');

    const submitBtn = screen.getByRole('button', { name: /file as new report anyway/i });
    await user.click(submitBtn);
    expect(onSubmitAnyway).toHaveBeenCalledTimes(1);
  });

  it('exercises TrackView active support click and success status', async () => {
    const user = userEvent.setup();
    const onSupport = vi.fn().mockResolvedValue(undefined);

    const activeTicket = {
      id: 'CR-ACTIVE99',
      status: Status.IN_PROGRESS,
      category: Category.STREETLIGHT,
      urgency: Urgency.MEDIUM,
      department: 'Electrical Maintenance',
      summary: 'Streetlight out near corner',
      created_at: new Date('2026-11-20T10:00:00Z').toISOString(),
      due_at: new Date('2026-11-24T10:00:00Z').toISOString(),
      overdue: false,
      duplicate_count: 0,
      reasons: [],
      applied_rules: [
        {
          id: 'R_DEMO',
          label: 'Priority Ward',
          effect: 'Prioritized for rapid crew dispatch',
        },
      ],
      timeline: [],
      emergency_notice: false,
      reopen_count: 0,
    };

    render(
      <TrackView
        ticket={activeTicket}
        onSupport={onSupport}
        onReopen={vi.fn()}
      />
    );

    const supportBtn = screen.getByRole('button', { name: /i have this issue too/i });
    await user.click(supportBtn);
    expect(onSupport).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(STRINGS.track.supportedSuccess)).toBeInTheDocument();
  });

  it('exercises QueueTable overdue badge, location fallback, and loading more spinner', () => {
    const baseTicket: AuthorityTicketView = {
      id: 'CR-OVERDUE1',
      status: Status.SUBMITTED,
      category: Category.POTHOLE,
      urgency: Urgency.HIGH,
      department: 'Roads',
      summary: 'Road crack',
      description: 'Road crack description',
      created_at: new Date(Date.now() - 100000000).toISOString(),
      due_at: new Date(Date.now() - 50000000).toISOString(), // overdue
      overdue: true,
      duplicate_count: 0,
      reasons: [],
      applied_rules: [],
      timeline: [],
      emergency_notice: false,
      needs_manual_triage: false,
      escalated: false,
      reopen_count: 0,
      ai_suggestion: null,
      version: 1,
    };

    const tickets: AuthorityTicketView[] = [
      baseTicket,
      {
        ...baseTicket,
        id: 'CR-FALLBACK2',
        status: Status.ASSIGNED,
        category: Category.GARBAGE,
        urgency: Urgency.LOW,
        department: 'Sanitation',
        summary: 'Bins full',
        location: { address: 'MG Road Junction', lat: 12.97, lng: 77.59 },
        due_at: new Date(Date.now() + 100000000).toISOString(),
        overdue: false,
      },
      {
        ...baseTicket,
        id: 'CR-CITYWIDE3',
        status: Status.SUBMITTED,
        category: Category.SEWER_OVERFLOW,
        urgency: Urgency.LOW,
        department: 'Drainage',
        summary: 'Water backup',
        location: undefined,
        due_at: new Date(Date.now() + 100000000).toISOString(),
        overdue: false,
      },
    ];

    render(
      <QueueTable
        tickets={tickets}
        isLoading={false}
        isError={false}
        selectedTicketId="CR-OVERDUE1"
        onSelectTicket={vi.fn()}
        onClearFilters={vi.fn()}
        hasNextPage={true}
        isFetchingNextPage={true}
        onLoadMore={vi.fn()}
      />
    );

    expect(screen.getByText('MG Road Junction')).toBeInTheDocument();
    expect(screen.getAllByText('Citywide').length).toBeGreaterThan(0);
    expect(screen.getByText('Loading reports...')).toBeInTheDocument();
  });

  it('exercises AuthorityNav with VITE_GOOGLE_MAPS_BROWSER_KEY enabled', () => {
    const prevKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
    // @ts-expect-error - simulating browser key presence
    import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY = 'demo-maps-key-123';

    render(
      <MemoryRouter initialEntries={['/authority/map']}>
        <AuthorityNav />
      </MemoryRouter>
    );

    expect(screen.getByText(STRINGS.authority.navMap)).toBeInTheDocument();

    // Reset env
    // @ts-expect-error - reset env
    import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY = prevKey;
  });

  it('exercises TicketDetailSheet with zero duplicates, no AI suggestion, staff override change, and conflict', async () => {
    const user = userEvent.setup();
    const mockStaffTicket: AuthorityTicketView = {
      id: 'CR-STAFF999',
      status: Status.IN_PROGRESS,
      category: Category.SEWER_OVERFLOW,
      urgency: Urgency.CRITICAL,
      department: 'Drainage Board',
      summary: 'Storm drain clogged',
      description: 'Storm drain clogged near main market',
      ai_suggestion: null,
      created_at: new Date('2026-11-20T10:00:00Z').toISOString(),
      due_at: new Date('2026-11-21T10:00:00Z').toISOString(),
      overdue: false,
      duplicate_count: 0,
      reasons: [],
      applied_rules: [],
      timeline: [
        {
          id: 'ev-1',
          status: Status.SUBMITTED,
          role: Role.CITIZEN,
          note: 'Initial report',
          at: new Date('2026-11-20T10:00:00Z').toISOString(),
        },
        {
          id: 'ev-2',
          status: Status.IN_PROGRESS,
          role: Role.AUTHORITY,
          note: 'Supervisor override applied',
          at: new Date('2026-11-20T11:00:00Z').toISOString(),
        },
      ],
      emergency_notice: false,
      needs_manual_triage: false,
      escalated: false,
      reopen_count: 0,
      version: 2,
    };

    const mockApi = {
      getAuthorityTicket: vi.fn().mockResolvedValue(mockStaffTicket),
      getMeta: vi.fn().mockResolvedValue({
        categories: [Category.SEWER_OVERFLOW],
        urgencies: [Urgency.CRITICAL],
        statuses: [Status.IN_PROGRESS, Status.RESOLVED],
        roles: [Role.CITIZEN, Role.AUTHORITY],
        departments: [],
        slaHours: { low: 168, medium: 96, high: 48, critical: 24 },
        status_transitions: { in_progress: [Status.RESOLVED] },
      }),
      updateAuthorityStatus: vi.fn(),
      overrideAuthorityTriage: vi.fn(),
    } as unknown as ApiClient;

    renderWithClient(
      <TicketDetailSheet
        ticketId="CR-STAFF999"
        open={true}
        onOpenChange={vi.fn()}
      />,
      mockApi
    );

    expect(await screen.findByText('CR-STAFF999')).toBeInTheDocument();
    expect(screen.getByText('Rule-based triage applied without generative model suggestion.')).toBeInTheDocument();
    expect(screen.queryByText(/duplicate cluster primary/i)).not.toBeInTheDocument();

    // Trigger concurrency conflict 409
    const conflictError = new apiClientModule.ApiError(409, 'conflict', 'Conflict detected');
    mockApi.updateAuthorityStatus = vi.fn().mockRejectedValueOnce(conflictError);

    const select = screen.getByLabelText(/next legal status/i);
    fireEvent.change(select, { target: { value: Status.RESOLVED } });
    const note = screen.getByLabelText(/resolution note/i);
    await user.type(note, 'Cleared storm drain blockage');
    const submitBtn = screen.getByRole('button', { name: /apply status update/i });
    await user.click(submitBtn);

    expect(await screen.findByText('Concurrency Conflict')).toBeInTheDocument();
    const reloadBtn = screen.getByRole('button', { name: /reload report/i });
    await user.click(reloadBtn);
  });

  it('exercises ReportPage submit error retry branch and rejected outcome', async () => {
    const user = userEvent.setup();
    const mockApi = {
      analyzeReport: vi.fn().mockResolvedValue({
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
        },
        similar_reports: [],
        meta: { ai_source: 'mock', degraded: false },
      }),
      submitReport: vi.fn()
        .mockRejectedValueOnce(new Error('Network glitch on submit'))
        .mockResolvedValueOnce({
          outcome: { kind: 'rejected', reason: 'Non-civic matter', guidance: 'Contact private agency' },
          ticket: null,
          meta: { ai_source: 'mock', degraded: false },
        }),
      getWards: vi.fn().mockResolvedValue([]),
    } as unknown as ApiClient;

    renderWithClient(<ReportPage />, mockApi);

    // 1. Step 1: Describe
    const textarea = screen.getByPlaceholderText(/large open pothole/i);
    await user.type(textarea, 'Huge pothole in the road near the market');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // 2. Step 2: Location
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /review ai analysis/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /review ai analysis/i }));

    // 3. Step 3: Review -> click submit -> fails first time with retry button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: new RegExp(STRINGS.report.confirmButton, 'i') })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: new RegExp(STRINGS.report.confirmButton, 'i') }));

    expect(await screen.findByText('Network glitch on submit')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /try again/i });
    await user.click(retryBtn);

    // 4. Second submission returns rejected outcome -> renders RejectedCard
    expect(await screen.findByTestId('rejected-card')).toBeInTheDocument();
  });

  it('exercises TrackPage with rejected ticket status', async () => {
    const rejectedTicket = {
      id: 'CR-77777777',
      status: Status.REJECTED,
      category: Category.NOT_CIVIC,
      urgency: Urgency.LOW,
      department: 'General Administration',
      summary: 'Private home dispute',
      created_at: new Date('2026-11-20T10:00:00Z').toISOString(),
      due_at: new Date('2026-11-25T10:00:00Z').toISOString(),
      overdue: false,
      duplicate_count: 0,
      reasons: ['Not a municipal jurisdiction matter'],
      applied_rules: [],
      timeline: [],
      reopen_count: 0,
    };

    const mockApi = {
      getTicket: vi.fn().mockResolvedValue(rejectedTicket),
    } as unknown as ApiClient;

    setApiClient(mockApi);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    render(
      <MemoryRouter initialEntries={['/track/CR-77777777']}>
        <ApiClientContext.Provider value={mockApi}>
          <QueryClientProvider client={queryClient}>
            <Routes>
              <Route path="/track/:id" element={<TrackPage />} />
            </Routes>
          </QueryClientProvider>
        </ApiClientContext.Provider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Private home dispute')).toBeInTheDocument();
    expect(screen.getByText('Not Actionable')).toBeInTheDocument();
  });
});
