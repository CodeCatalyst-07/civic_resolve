import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  Category,
  Urgency,
  Status,
  Role,
  AiSource,
  type AuthorityTicketView,
} from '@civicresolve/shared';
import * as apiClientModule from '../../lib/apiClient.js';
import { RoleContext } from '../../hooks/useRole.js';
import { KpiTiles } from './components/KpiTiles.js';
import { FilterBar } from './components/FilterBar.js';
import { QueueTable } from './components/QueueTable.js';
import { TicketDetailSheet } from './components/TicketDetailSheet.js';
import { AuthorityMapPage } from './pages/AuthorityMapPage.js';

const mockTicket: AuthorityTicketView = {
  id: 'CR-7X2K9M4P',
  status: Status.IN_PROGRESS,
  category: Category.POTHOLE,
  urgency: Urgency.HIGH,
  department: 'Roads & Infrastructure',
  summary: 'Deep road crater on 100ft road',
  ward: 'Ward 12 - Indiranagar',
  description: 'Deep road crater on 100ft road near NPS School. School buses and ambulances getting stuck.',
  location: {
    lat: 12.9719,
    lng: 77.6416,
    address: '100ft Road, Indiranagar',
  },
  created_at: '2026-11-21T08:00:00.000Z',
  due_at: '2026-11-23T08:00:00.000Z',
  overdue: false,
  duplicate_count: 3,
  reasons: ['Heavy public traffic', 'School zone proximity'],
  applied_rules: [
    {
      id: 'R3_LOCATION_BOOST',
      label: 'Sensitive Location Proximity',
      effect: 'Boosted from Medium to High',
    },
  ],
  timeline: [
    {
      id: 'evt-1',
      status: Status.SUBMITTED,
      role: Role.CITIZEN,
      note: 'Grievance submitted by citizen',
      at: '2026-11-21T08:00:00.000Z',
    },
    {
      id: 'evt-2',
      status: Status.IN_PROGRESS,
      role: Role.AUTHORITY,
      note: 'Field crew dispatched with patcher truck',
      at: '2026-11-21T09:00:00.000Z',
    },
  ],
  emergency_notice: false,
  ai_suggestion: {
    is_civic_issue: true,
    category: Category.POTHOLE,
    urgency: Urgency.MEDIUM,
    confidence: 0.95,
    summary: 'Pothole on 100ft road',
    reasons: ['Road surface damage'],
    safety_critical: false,
    missing_info: [],
  },
  needs_manual_triage: false,
  escalated: false,
  reopen_count: 0,
  version: 1,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
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
        <MemoryRouter>{ui}</MemoryRouter>
      </RoleContext.Provider>
    </QueryClientProvider>
  );
}

describe('Authority Component Interactions & Logic', () => {
  const mockApi = {
    getStats: vi.fn().mockResolvedValue({
      open: 15,
      critical_open: 3,
      overdue: 2,
      resolved_last_7_days: 8,
      resolved: 40,
      median_resolution_hours: 24,
    }),
    getMeta: vi.fn().mockResolvedValue({
      categories: [Category.POTHOLE, Category.GARBAGE],
      urgencies: [Urgency.LOW, Urgency.MEDIUM, Urgency.HIGH, Urgency.CRITICAL],
      statuses: [Status.SUBMITTED, Status.IN_PROGRESS, Status.RESOLVED, Status.CLOSED],
      roles: [Role.CITIZEN, Role.AUTHORITY],
      departments: [],
      slaHours: {},
      status_transitions: {
        [Status.IN_PROGRESS]: [Status.RESOLVED],
        [Status.RESOLVED]: [Status.CLOSED],
      },
    }),
    getWards: vi.fn().mockResolvedValue([
      { name: 'Ward 12 - Indiranagar', number: 12 },
      { name: 'Ward 18 - Koramangala', number: 18 },
    ]),
    getAuthorityQueue: vi.fn().mockResolvedValue({
      tickets: [mockTicket],
      next_cursor: 'cur-2',
    }),
    getAuthorityTicket: vi.fn().mockResolvedValue(mockTicket),
    updateAuthorityStatus: vi.fn().mockResolvedValue({ ...mockTicket, status: Status.RESOLVED }),
    overrideAuthorityTriage: vi.fn().mockResolvedValue({ ...mockTicket, urgency: Urgency.CRITICAL }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClientModule.setApiClient(mockApi as unknown as apiClientModule.ApiClient);
  });

  describe('KpiTiles', () => {
    it('handles clicking KPI tiles to toggle filters', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();

      const stats = {
        open: 15,
        critical_open: 3,
        overdue: 2,
        resolved_last_7_days: 8,
        resolved: 40,
        median_resolution_hours: 24,
      };

      const { rerender } = render(
        <KpiTiles
          stats={stats}
          isLoading={false}
          filters={{}}
          onFilterChange={onFilterChange}
        />
      );

      // 1. Toggle Critical
      const criticalBtn = screen.getByRole('button', { name: /critical/i });
      await user.click(criticalBtn);
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ urgency: Urgency.CRITICAL }));

      // 2. Toggle Overdue
      const overdueBtn = screen.getByRole('button', { name: /overdue/i });
      await user.click(overdueBtn);
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ overdue: true }));

      // 3. Toggle Resolved
      const resolvedBtn = screen.getByRole('button', { name: /resolved/i });
      await user.click(resolvedBtn);
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ status: Status.RESOLVED }));

      // 4. Toggle Open (clear)
      const openBtn = screen.getByRole('button', { name: /open reports/i });
      await user.click(openBtn);
      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined, urgency: undefined, overdue: undefined })
      );

      // Re-render with active critical to test un-toggling
      rerender(
        <KpiTiles
          stats={stats}
          isLoading={false}
          filters={{ urgency: Urgency.CRITICAL }}
          onFilterChange={onFilterChange}
        />
      );
      await user.click(screen.getByRole('button', { name: /critical/i }));
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ urgency: undefined }));

      // Re-render with active overdue to test un-toggling
      rerender(
        <KpiTiles
          stats={stats}
          isLoading={false}
          filters={{ overdue: true }}
          onFilterChange={onFilterChange}
        />
      );
      await user.click(screen.getByRole('button', { name: /overdue/i }));
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ overdue: undefined }));

      // Re-render with active resolved to test un-toggling
      rerender(
        <KpiTiles
          stats={stats}
          isLoading={false}
          filters={{ status: Status.RESOLVED }}
          onFilterChange={onFilterChange}
        />
      );
      await user.click(screen.getByRole('button', { name: /resolved/i }));
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }));
    });
  });

  describe('FilterBar', () => {
    it('fires onFilterChange when dropdowns, checkboxes, and clear buttons are clicked', async () => {
      const user = userEvent.setup();
      const onFilterChange = vi.fn();

      renderWithProviders(
        <FilterBar
          filters={{ status: Status.SUBMITTED }}
          onFilterChange={onFilterChange}
        />
      );

      // Status select
      const statusSelect = screen.getByLabelText(/status/i);
      fireEvent.change(statusSelect, { target: { value: Status.IN_PROGRESS } });
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ status: Status.IN_PROGRESS }));

      // Category select
      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: Category.POTHOLE } });
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ category: Category.POTHOLE }));

      // Urgency select
      const urgencySelect = screen.getByLabelText(/urgency/i);
      fireEvent.change(urgencySelect, { target: { value: Urgency.HIGH } });
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ urgency: Urgency.HIGH }));

      // Ward select
      await waitFor(() => {
        expect(screen.getByText('Ward 12 - Indiranagar')).toBeInTheDocument();
      });
      const wardSelect = screen.getByLabelText(/ward/i);
      fireEvent.change(wardSelect, { target: { value: 'Ward 12 - Indiranagar' } });
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ ward: 'Ward 12 - Indiranagar' }));

      // Overdue checkbox
      const overdueCheckbox = screen.getByLabelText(/overdue only/i);
      await user.click(overdueCheckbox);
      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ overdue: true }));

      // Clear filters button
      const clearBtn = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearBtn);
      expect(onFilterChange).toHaveBeenCalledWith({});
    });
  });

  describe('QueueTable', () => {
    it('handles clicking row and pagination button', async () => {
      const user = userEvent.setup();
      const onSelectTicket = vi.fn();
      const onLoadMore = vi.fn();
      const onClearFilters = vi.fn();

      render(
        <QueueTable
          tickets={[mockTicket]}
          isLoading={false}
          isError={false}
          selectedTicketId={null}
          onSelectTicket={onSelectTicket}
          onClearFilters={onClearFilters}
          hasNextPage={true}
          isFetchingNextPage={false}
          onLoadMore={onLoadMore}
        />
      );

      const row = screen.getByTestId('queue-row-CR-7X2K9M4P');
      await user.click(row);
      expect(onSelectTicket).toHaveBeenCalledWith('CR-7X2K9M4P');

      const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
      await user.click(loadMoreBtn);
      expect(onLoadMore).toHaveBeenCalled();
    });
  });

  describe('TicketDetailSheet', () => {
    it('submits status update and validates required note when resolving', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <TicketDetailSheet
          ticketId="CR-7X2K9M4P"
          open={true}
          onOpenChange={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('CR-7X2K9M4P')).toBeInTheDocument();
      });

      // 1. Select Status.RESOLVED from next status dropdown
      const statusSelect = screen.getByLabelText(/next legal status/i);
      fireEvent.change(statusSelect, { target: { value: Status.RESOLVED } });

      // 2. Try submitting without resolution note -> assert validation error
      const submitBtn = screen.getByRole('button', { name: /apply status update/i });
      await user.click(submitBtn);

      expect(await screen.findByText(/resolution note explaining field actions/i)).toBeInTheDocument();

      // 3. Fill in resolution note and submit successfully
      const noteTextarea = screen.getByLabelText(/resolution note/i);
      await user.type(noteTextarea, 'Pothole cold-mixed and compacted with roller.');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockApi.updateAuthorityStatus).toHaveBeenCalledWith('CR-7X2K9M4P', {
          status: Status.RESOLVED,
          note: 'Pothole cold-mixed and compacted with roller.',
        });
      });
    });

    it('submits manual supervisor override and enforces minimum 5-character reason', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <TicketDetailSheet
          ticketId="CR-7X2K9M4P"
          open={true}
          onOpenChange={() => {}}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('CR-7X2K9M4P')).toBeInTheDocument();
      });

      // Open manual override disclosure
      const overrideSummary = screen.getByText(/supervisor manual override/i);
      await user.click(overrideSummary);

      // Select urgency
      const urgencySelect = screen.getByLabelText(/adjust urgency/i);
      fireEvent.change(urgencySelect, { target: { value: Urgency.CRITICAL } });

      // Type too short reason
      const reasonTextarea = screen.getByLabelText(/override justification/i);
      await user.type(reasonTextarea, 'Bad');

      const submitBtn = screen.getByRole('button', { name: /submit supervisor override/i });
      await user.click(submitBtn);

      expect(await screen.findByText(/detailed reason \(at least 5 characters\) is required/i)).toBeInTheDocument();

      // Enter valid reason and submit
      await user.clear(reasonTextarea);
      await user.type(reasonTextarea, 'High risk near upcoming marathon route.');
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockApi.overrideAuthorityTriage).toHaveBeenCalledWith('CR-7X2K9M4P', {
          urgency: Urgency.CRITICAL,
          category: undefined,
          reason: 'High risk near upcoming marathon route.',
        });
      });
    });

    it('renders detail panel honestly from minimal API response without invented data', async () => {
      const minimalTicket: AuthorityTicketView = {
        id: 'CR-MINIMAL1',
        status: Status.SUBMITTED,
        category: Category.POTHOLE,
        urgency: Urgency.LOW,
        department: 'Roads & Infrastructure',
        summary: 'Minimal test pothole',
        ward: 'Ward 1 - Kempegowda Ward',
        created_at: new Date('2026-11-21T00:00:00.000Z').toISOString(),
        due_at: new Date('2026-11-28T00:00:00.000Z').toISOString(),
        overdue: false,
        duplicate_count: 0,
        reasons: [],
        applied_rules: [],
        timeline: [
          {
            id: 'evt-min-1',
            status: Status.SUBMITTED,
            role: Role.CITIZEN,
            at: new Date('2026-11-21T00:00:00.000Z').toISOString(),
          },
        ],
        emergency_notice: false,
        description: 'Verbatim minimal complaint text reported by citizen.',
        location: undefined,
        ai_suggestion: null,
        ai_source: AiSource.KEYWORD_FALLBACK,
        needs_manual_triage: false,
        escalated: false,
        reopen_count: 0,
        version: 1,
      };

      vi.mocked(mockApi.getAuthorityTicket).mockResolvedValueOnce(minimalTicket);

      renderWithProviders(
        <TicketDetailSheet
          ticketId="CR-MINIMAL1"
          open={true}
          onOpenChange={() => {}}
        />
      );

      // Asserts verbatim data from API response renders
      expect(await screen.findByText('CR-MINIMAL1')).toBeInTheDocument();
      expect(screen.getByText('Verbatim minimal complaint text reported by citizen.')).toBeInTheDocument();
      expect(screen.getByText('Ward 1 - Kempegowda Ward')).toBeInTheDocument();
      expect(screen.getByText(/rule-based triage applied without generative model suggestion/i)).toBeInTheDocument();

      // Asserts that no invented, derived or unbacked elements appear
      expect(screen.queryByText(/duplicate cluster/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/similar reports/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/add my support/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/similarity/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/life-safety hazard active/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument();
    });
  });

  describe('AuthorityMapPage', () => {
    it('renders fallback card when maps key is missing and allows opening ticket details', async () => {
      const user = userEvent.setup();

      renderWithProviders(<AuthorityMapPage />);

      expect(await screen.findByText(/interactive map key not configured/i)).toBeInTheDocument();
      expect(screen.getByText(/accessible list of plotted grievance locations/i)).toBeInTheDocument();

      // Verify urgency shape encoding in legend
      expect(screen.getByText('Circle: Low')).toBeInTheDocument();
      expect(screen.getByText('Square: Medium')).toBeInTheDocument();
      expect(screen.getByText('Triangle: High')).toBeInTheDocument();
      expect(screen.getByText('Diamond: Critical')).toBeInTheDocument();

      // Click "Open Details" in accessible list
      const openBtn = await screen.findByRole('button', { name: /open details/i });
      await user.click(openBtn);

      // Verify detail sheet opened
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
  });
});
