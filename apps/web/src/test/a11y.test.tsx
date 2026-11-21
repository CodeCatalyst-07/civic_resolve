import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Category, Urgency, Status, Role, type PublicTicketView } from '@civicresolve/shared';
import { RoleProvider } from '../hooks/useRole.js';
import { UrgencyBadge } from '../components/UrgencyBadge.js';
import { StatusPill } from '../components/StatusPill.js';
import { CategoryChip } from '../components/CategoryChip.js';
import { Callout } from '../components/Callout.js';
import { Stepper } from '../components/Stepper.js';
import { Timeline } from '../components/Timeline.js';
import { EmptyState } from '../components/EmptyState.js';
import { ErrorState } from '../components/ErrorState.js';
import { StepDescribe } from '../features/citizen/components/StepDescribe.js';
import { StepLocation } from '../features/citizen/components/StepLocation.js';
import { StepReview } from '../features/citizen/components/StepReview.js';
import { StepConfirmation } from '../features/citizen/components/StepConfirmation.js';
import { TrackView } from '../features/citizen/components/TrackView.js';
import { ReopenDialog } from '../features/citizen/components/ReopenDialog.js';
import { RoleDialog } from '../components/RoleDialog.js';

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <RoleProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </RoleProvider>
    </QueryClientProvider>
  );
}

const mockTicket: PublicTicketView = {
  id: 'CR-7X2K9M4P',
  status: Status.SUBMITTED,
  category: Category.POTHOLE,
  urgency: Urgency.HIGH,
  department: 'Roads & Infrastructure',
  summary: 'Pothole on 100ft road Indiranagar',
  ward: 'Ward 12',
  created_at: '2026-11-20T10:00:00.000Z',
  due_at: '2026-11-22T10:00:00.000Z',
  overdue: false,
  duplicate_count: 3,
  reasons: ['Pothole in heavy traffic area'],
  applied_rules: [
    {
      id: 'R3_LOCATION_BOOST',
      label: 'Sensitive Location Proximity',
      effect: 'Boosted from Medium to High near school',
    },
  ],
  timeline: [
    {
      id: 'evt-1',
      status: Status.SUBMITTED,
      role: Role.CITIZEN,
      note: 'Grievance submitted by citizen',
      at: '2026-11-20T10:00:00.000Z',
    },
    {
      id: 'evt-2',
      status: Status.ASSIGNED,
      role: Role.AUTHORITY,
      note: 'Dispatched to BBMP East division road gang',
      at: '2026-11-20T11:00:00.000Z',
    },
  ],
  emergency_notice: false,
};

describe('Automated WCAG 2.2 AA Accessibility Audits (vitest-axe)', () => {
  it('verifies UrgencyBadge has no axe violations for all urgency levels', async () => {
    const { container } = render(
      <div>
        <UrgencyBadge urgency={Urgency.CRITICAL} />
        <UrgencyBadge urgency={Urgency.HIGH} />
        <UrgencyBadge urgency={Urgency.MEDIUM} />
        <UrgencyBadge urgency={Urgency.LOW} />
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies StatusPill has no axe violations for all statuses', async () => {
    const { container } = render(
      <div>
        <StatusPill status={Status.SUBMITTED} />
        <StatusPill status={Status.UNDER_REVIEW} />
        <StatusPill status={Status.ASSIGNED} />
        <StatusPill status={Status.IN_PROGRESS} />
        <StatusPill status={Status.RESOLVED} />
        <StatusPill status={Status.CLOSED} />
        <StatusPill status={Status.REJECTED} />
        <StatusPill status={Status.REOPENED} />
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies CategoryChip has no axe violations across categories', async () => {
    const { container } = render(
      <div>
        <CategoryChip category={Category.POTHOLE} />
        <CategoryChip category={Category.GARBAGE} />
        <CategoryChip category={Category.STREETLIGHT} />
        <CategoryChip category={Category.WATER_LEAKAGE} />
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies Callout variants have no axe violations', async () => {
    const { container } = render(
      <div>
        <Callout variant="info" title="Information">Some note</Callout>
        <Callout variant="warning" title="Warning">Be careful</Callout>
        <Callout variant="danger" title="Hazard">Immediate danger</Callout>
        <Callout variant="emergency" title="Emergency 112">Call immediately</Callout>
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies Stepper has no axe violations', async () => {
    const steps = [
      { id: 1, title: 'Describe' },
      { id: 2, title: 'Location' },
      { id: 3, title: 'Review' },
      { id: 4, title: 'Receipt' },
    ];
    const { container } = render(<Stepper steps={steps} currentStep={2} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies Timeline has no axe violations', async () => {
    const { container } = render(<Timeline events={mockTicket.timeline} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies EmptyState and ErrorState have no axe violations', async () => {
    const { container } = render(
      <div>
        <EmptyState title="No Reports" description="None reported yet" />
        <ErrorState title="Failed" message="Could not load" onRetry={() => {}} />
      </div>
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies StepDescribe has no axe violations', async () => {
    const { container } = render(
      <StepDescribe
        value="Large pothole on 100ft road near signal."
        onChange={() => {}}
        onNext={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies StepLocation has no axe violations', async () => {
    const wrapper = createWrapper();
    const { container } = render(
      <StepLocation
        value={{ ward: 'Ward 1', address: '123 Main St' }}
        onChange={() => {}}
        onNext={() => {}}
        onBack={() => {}}
      />,
      { wrapper }
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies StepReview with TriageCard and SimilarReports has no axe violations', async () => {
    const analysis = {
      outcome: {
        kind: 'ticket' as const,
        decision: {
          category: Category.POTHOLE,
          urgency: Urgency.HIGH,
          department: 'roads' as const,
          applied_rules: mockTicket.applied_rules,
          emergency_notice: false,
          needs_manual_triage: false,
          ai_suggestion: {
            is_civic_issue: true,
            category: Category.POTHOLE,
            urgency: Urgency.HIGH,
            confidence: 0.9,
            summary: 'Large road damage crater',
            reasons: ['Skid risk'],
            safety_critical: false,
            missing_info: [],
          },
        },
        needs_manual_triage: false,
        emergency_notice: false,
      },
      similar_reports: [
        {
          id: 'CR-11111111',
          category: Category.POTHOLE,
          urgency: Urgency.MEDIUM,
          status: Status.SUBMITTED,
          summary: 'Existing pothole report',
          duplicate_count: 2,
          created_at: '2026-11-20T08:00:00.000Z',
        },
      ],
      meta: {
        ai_source: 'gemini' as const,
        degraded: false,
      },
    };

    const { container } = render(
      <StepReview
        analysis={analysis}
        categoryOverride={null}
        onCategoryOverrideChange={() => {}}
        onAnswerFollowUp={() => {}}
        onSubmitReport={() => {}}
        onSupportExisting={() => {}}
        onBack={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies StepConfirmation receipt has no axe violations', async () => {
    const wrapper = createWrapper();
    const { container } = render(
      <StepConfirmation ticket={mockTicket} onReset={() => {}} />,
      { wrapper }
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies TrackView has no axe violations', async () => {
    const { container } = render(
      <TrackView
        ticket={{ ...mockTicket, overdue: true }}
        onSupport={async () => {}}
        onReopen={async () => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('verifies ReopenDialog modal has no axe violations when open', async () => {
    const { baseElement } = render(
      <ReopenDialog
        open={true}
        onOpenChange={() => {}}
        ticketId={mockTicket.id}
        onConfirmReopen={async () => {}}
      />
    );
    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it('verifies RoleDialog modal has no axe violations when open', async () => {
    const wrapper = createWrapper();
    const { baseElement } = render(
      <RoleDialog open={true} onOpenChange={() => {}} />,
      { wrapper }
    );
    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
