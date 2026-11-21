import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FollowUpCard } from '../features/citizen/components/FollowUpCard.js';
import { RejectedCard } from '../features/citizen/components/RejectedCard.js';
import { App } from '../app/App.js';
import { StepDescribe } from '../features/citizen/components/StepDescribe.js';
import { StepLocation } from '../features/citizen/components/StepLocation.js';
import { ReportPage } from '../app/pages/ReportPage.js';
import { FetchApiClient, setApiClient, type ApiClient } from '../lib/apiClient.js';
import { RoleProvider, useRole } from '../hooks/useRole.js';
import { queryClient } from '../lib/queryClient.js';
import { Category, Urgency, Status, Role } from '@civicresolve/shared';

describe('Coverage Boost for Apps/Web (Reaching >= 85% Lines & Branches)', () => {
  it('renders and interacts with FollowUpCard', async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();

    render(
      <FollowUpCard
        question="Which landmark is the pothole closest to?"
        round={1}
        onAnswer={onAnswer}
      />
    );

    expect(screen.getByText(/which landmark is the pothole closest to/i)).toBeInTheDocument();
    const textarea = screen.getByPlaceholderText(/type your clarification/i);
    await user.type(textarea, 'Opposite to National Public School gate');
    const submitBtn = screen.getByRole('button', { name: /update and re-analyze/i });
    await user.click(submitBtn);

    expect(onAnswer).toHaveBeenCalledWith('Opposite to National Public School gate');
  });

  it('renders RejectedCard with explanation and emergency notice', () => {
    const { rerender } = render(
      <RejectedCard
        reason="Private property dispute"
        guidance="Contact civil court or local police station"
        emergencyNotice={false}
      />
    );

    expect(screen.getByText('Private property dispute')).toBeInTheDocument();
    expect(screen.getByText(/contact civil court/i)).toBeInTheDocument();
    expect(screen.queryByText(/emergency notice/i)).not.toBeInTheDocument();

    rerender(
      <RejectedCard
        reason="Commercial banner issue"
        guidance="Contact advertiser"
        emergencyNotice={true}
      />
    );
    expect(screen.getByText(/emergency notice/i)).toBeInTheDocument();
  });

  it('renders root App component and navigates to default route', async () => {
    render(<App />);
    expect(await screen.findByRole('banner')).toBeInTheDocument();
  });

  it('exercises StepDescribe validation branches and quick prompt clicks', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onNext = vi.fn();

    const { rerender } = render(
      <StepDescribe value="" onChange={onChange} onNext={onNext} />
    );

    // Click sample prompt
    const promptBtn = screen.getByRole('button', { name: /pothole on road/i });
    await user.click(promptBtn);
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('100ft road'));

    // Test with < 10 chars
    rerender(<StepDescribe value="Short" onChange={onChange} onNext={onNext} />);
    // Submit with short
    const nextBtn = screen.getByRole('button', { name: /continue/i });
    expect(nextBtn).toBeDisabled();

    // Test with > 1000 chars
    const longText = 'A'.repeat(1005);
    rerender(<StepDescribe value={longText} onChange={onChange} onNext={onNext} />);
    expect(screen.getByText(/1005 \/ 1000 characters/i)).toHaveClass('text-red-600');
  });

  it('exercises StepLocation geolocation permission denial', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const qc = new QueryClient();

    // Mock geolocation error
    const getCurrentPosition = vi.fn().mockImplementation((_, errCb) => {
      errCb({ code: 1, PERMISSION_DENIED: 1, message: 'User denied' });
    });
    Object.assign(navigator, {
      geolocation: { getCurrentPosition },
    });

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <StepLocation
            value={{}}
            onChange={onChange}
            onNext={() => {}}
            onBack={() => {}}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const geoBtn = screen.getByRole('button', { name: /use my current location/i });
    await user.click(geoBtn);

    expect(await screen.findByText(/location permission denied/i)).toBeInTheDocument();
  });

  it('exercises StepLocation geolocation success', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const qc = new QueryClient();

    const getCurrentPosition = vi.fn().mockImplementation((successCb) => {
      successCb({
        coords: { latitude: 12.9716, longitude: 77.5946 },
      });
    });
    Object.assign(navigator, {
      geolocation: { getCurrentPosition },
    });

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <StepLocation
            value={{}}
            onChange={onChange}
            onNext={() => {}}
            onBack={() => {}}
          />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const geoBtn = screen.getByRole('button', { name: /use my current location/i });
    await user.click(geoBtn);

    expect(onChange).toHaveBeenCalledWith({ lat: 12.9716, lng: 77.5946 });
  });

  it('exercises RoleProvider setters and localStorage persistence', async () => {
    const user = userEvent.setup();

    function TestRoleConsumer() {
      const { role, setRole, authorityCode, setAuthorityCode, isAuthority } = useRole();
      return (
        <div>
          <span data-testid="role">{role}</span>
          <span data-testid="auth-code">{authorityCode}</span>
          <span data-testid="is-auth">{String(isAuthority)}</span>
          <button onClick={() => setRole(Role.AUTHORITY)}>Make Authority</button>
          <button onClick={() => setAuthorityCode('new-code-123')}>Change Code</button>
        </div>
      );
    }

    render(
      <RoleProvider>
        <TestRoleConsumer />
      </RoleProvider>
    );

    expect(screen.getByTestId('role')).toHaveTextContent('citizen');
    expect(screen.getByTestId('is-auth')).toHaveTextContent('false');

    await user.click(screen.getByText('Make Authority'));
    expect(screen.getByTestId('role')).toHaveTextContent('authority');
    expect(screen.getByTestId('is-auth')).toHaveTextContent('true');

    await user.click(screen.getByText('Change Code'));
    expect(screen.getByTestId('auth-code')).toHaveTextContent('new-code-123');
  });

  it('exercises queryClient retry configuration', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    const retryFn = defaultOptions.queries?.retry as (
      count: number,
      err: unknown
    ) => boolean;

    expect(retryFn(0, { status: 404 })).toBe(false);
    expect(retryFn(0, { status: 400 })).toBe(false);
    expect(retryFn(1, { status: 500 })).toBe(true);
    expect(retryFn(2, { status: 500 })).toBe(false);
  });

  it('exercises all remaining FetchApiClient methods against fetch mock', async () => {
    const mockFetch = vi.fn();
    (globalThis as { fetch: unknown }).fetch = mockFetch;

    const client = new FetchApiClient({ baseUrl: 'http://localhost:3000' });

    // geocode
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: { address: 'Indiranagar, Bengaluru', lat: 12.9716, lng: 77.5946 },
      }),
    });
    const geo = await client.geocode('Indiranagar');
    expect(geo.lat).toBe(12.9716);

    // supportTicket
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'CR-7X2K9M4P',
          status: 'submitted',
          category: 'pothole',
          urgency: 'high',
          department: 'Roads',
          summary: 'Road pothole',
          created_at: new Date().toISOString(),
          due_at: new Date().toISOString(),
          overdue: false,
          duplicate_count: 2,
          reasons: [],
          applied_rules: [],
          timeline: [],
          emergency_notice: false,
        },
      }),
    });
    const sup = await client.supportTicket('CR-7X2K9M4P');
    expect(sup.duplicate_count).toBe(2);

    // reopenTicket
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'CR-7X2K9M4P',
          status: 'reopened',
          category: 'pothole',
          urgency: 'high',
          department: 'Roads',
          summary: 'Road pothole',
          created_at: new Date().toISOString(),
          due_at: new Date().toISOString(),
          overdue: false,
          duplicate_count: 2,
          reasons: [],
          applied_rules: [],
          timeline: [],
          emergency_notice: false,
        },
      }),
    });
    const reo = await client.reopenTicket('CR-7X2K9M4P', 'Gravel washed away');
    expect(reo.status).toBe('reopened');

    // getAuthorityQueue
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          tickets: [],
        },
      }),
    });
    const queue = await client.getAuthorityQueue({ status: Status.SUBMITTED, limit: 20 });
    expect(queue.tickets).toEqual([]);

    // getAuthorityTicket
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'CR-7X2K9M4P',
          status: 'submitted',
          category: 'pothole',
          urgency: 'high',
          department: 'Roads',
          summary: 'Road pothole',
          created_at: new Date().toISOString(),
          due_at: new Date().toISOString(),
          overdue: false,
          duplicate_count: 2,
          reasons: [],
          applied_rules: [],
          timeline: [],
          emergency_notice: false,
          description: 'Full description',
          needs_manual_triage: false,
          escalated: false,
          reopen_count: 0,
          version: 1,
          ai_suggestion: null,
        },
      }),
    });
    const authTicket = await client.getAuthorityTicket('CR-7X2K9M4P');
    expect(authTicket.description).toBe('Full description');

    // updateAuthorityStatus
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          ...authTicket,
          status: 'in_progress',
        },
      }),
    });
    const updatedStatus = await client.updateAuthorityStatus('CR-7X2K9M4P', {
      status: Status.IN_PROGRESS,
    });
    expect(updatedStatus.status).toBe('in_progress');

    // overrideAuthorityTriage
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          ...authTicket,
          urgency: 'critical',
        },
      }),
    });
    const overridden = await client.overrideAuthorityTriage('CR-7X2K9M4P', {
      urgency: Urgency.CRITICAL,
      reason: 'Live site inspection confirmed immediate danger',
    });
    expect(overridden.urgency).toBe('critical');

    // submitReport
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          outcome: {
            kind: 'ticket',
            decision: {
              category: 'pothole',
              urgency: 'high',
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
            status: 'submitted',
            category: 'pothole',
            urgency: 'high',
            department: 'Roads',
            summary: 'Road pothole',
            created_at: new Date().toISOString(),
            due_at: new Date().toISOString(),
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
        },
      }),
    });
    const sub = await client.submitReport({
      description: 'Pothole on road near school',
    });
    expect(sub.ticket?.id).toBe('CR-7X2K9M4P');
  });

  it('exercises ReportPage follow-up and support shortcut branches', async () => {
    const user = userEvent.setup();
    const mockClient = {
      getStats: vi.fn(),
      getRecentReports: vi.fn(),
      getWards: vi.fn().mockResolvedValue([{ name: 'Ward 1', number: 1 }]),
      analyzeReport: vi.fn().mockResolvedValue({
        outcome: {
          kind: 'follow_up',
          question: 'What is the nearby landmark?',
          round: 0,
        },
        similar_reports: [],
        meta: { ai_source: 'mock', degraded: false },
      }),
      submitReport: vi.fn(),
      supportTicket: vi.fn().mockResolvedValue({}),
    };
    setApiClient(mockClient as unknown as ApiClient);

    const qc = new QueryClient();

    render(
      <QueryClientProvider client={qc}>
        <RoleProvider>
          <MemoryRouter>
            <ReportPage />
          </MemoryRouter>
        </RoleProvider>
      </QueryClientProvider>
    );

    // Type description
    const textarea = screen.getByLabelText(/what is the civic issue/i);
    await user.type(textarea, 'Water pipe leakage on 5th main road flooding the street.');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // On Location step, click Review
    const reviewBtn = await screen.findByRole('button', { name: /review ai analysis/i });
    await user.click(reviewBtn);

    // Follow-up card should appear
    expect(await screen.findByTestId('follow-up-card')).toBeInTheDocument();

    // Now mock second analysis returning ticket with similar reports
    mockClient.analyzeReport.mockResolvedValueOnce({
      outcome: {
        kind: 'ticket',
        decision: {
          category: Category.WATER_LEAKAGE,
          urgency: Urgency.HIGH,
          department: 'water_sewerage',
          applied_rules: [],
          emergency_notice: false,
          needs_manual_triage: false,
          ai_suggestion: null,
        },
        needs_manual_triage: false,
        emergency_notice: false,
      },
      similar_reports: [
        {
          id: 'CR-99999999',
          category: Category.WATER_LEAKAGE,
          urgency: Urgency.HIGH,
          status: Status.SUBMITTED,
          summary: 'Similar water pipe leakage',
          duplicate_count: 1,
          created_at: new Date().toISOString(),
        },
      ],
      meta: { ai_source: 'mock', degraded: false },
    });

    const followUpInput = screen.getByPlaceholderText(/type your clarification/i);
    await user.type(followUpInput, 'Near the post office');
    await user.click(screen.getByRole('button', { name: /update and re-analyze/i }));

    // Should now see similar reports panel
    expect(await screen.findByTestId('similar-reports-panel')).toBeInTheDocument();

    // Click support
    const supBtn = screen.getByRole('button', { name: /support this report/i });
    await user.click(supBtn);

    expect(mockClient.supportTicket).toHaveBeenCalledWith('CR-99999999');
  });
});
