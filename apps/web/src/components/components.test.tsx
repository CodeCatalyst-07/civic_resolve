import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UrgencyBadge } from './UrgencyBadge.js';
import { StatusPill } from './StatusPill.js';
import { CategoryChip } from './CategoryChip.js';
import { Callout } from './Callout.js';
import { CopyButton } from './CopyButton.js';
import { FieldError } from './FieldError.js';
import { ErrorSummary } from './ErrorSummary.js';
import { Skeleton } from './Skeleton.js';
import { Stepper } from './Stepper.js';
import { Timeline } from './Timeline.js';
import { Category, Urgency, Status, Role } from '@civicresolve/shared';

describe('Shared UI Components', () => {
  it('renders UrgencyBadge with plain label and accessible role', () => {
    render(<UrgencyBadge urgency={Urgency.CRITICAL} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent(/immediate danger/i);
    expect(badge).toHaveAttribute('aria-label', 'Urgency: Immediate Danger');
  });

  it('renders StatusPill with plain status and icon', () => {
    render(<StatusPill status={Status.RESOLVED} />);
    const pill = screen.getByRole('status');
    expect(pill).toHaveTextContent(/resolved/i);
  });

  it('renders CategoryChip with label and icon', () => {
    render(<CategoryChip category={Category.POTHOLE} />);
    expect(screen.getByText(/pothole & road damage/i)).toBeInTheDocument();
  });

  it('renders Callout with alert or region role depending on severity', () => {
    const { rerender } = render(<Callout variant="info" title="Info Note">Details</Callout>);
    expect(screen.getByRole('region')).toBeInTheDocument();

    rerender(<Callout variant="emergency" title="Emergency">Call 112</Callout>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('copies text and provides aria-live feedback in CopyButton', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    render(<CopyButton value="CR-7X2K9M4P" />);
    const btn = screen.getByRole('button', { name: /copy CR-7X2K9M4P/i });
    await user.click(btn);

    expect(writeText).toHaveBeenCalledWith('CR-7X2K9M4P');
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  it('renders FieldError only when error message is supplied', () => {
    const { rerender } = render(<FieldError error={null} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rerender(<FieldError error="Field is required" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/field is required/i);
  });

  it('renders ErrorSummary with alert role and error list', () => {
    render(<ErrorSummary errors={['First error', 'Second error']} />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('First error')).toBeInTheDocument();
    expect(screen.getByText('Second error')).toBeInTheDocument();
  });

  it('renders Skeleton with aria-busy and loading label', () => {
    render(<Skeleton count={3} />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
  });

  it('renders Stepper with active and completed steps', () => {
    const steps = [
      { id: 1, title: 'Step 1' },
      { id: 2, title: 'Step 2' },
      { id: 3, title: 'Step 3' },
    ];
    render(<Stepper steps={steps} currentStep={2} />);
    const current = screen.getByRole('listitem', { current: 'step' });
    expect(current).toBeInTheDocument();
    expect(current).toHaveTextContent('Step 2');
  });

  it('renders Timeline with event status, role, and note', () => {
    const events = [
      {
        id: '1',
        status: Status.SUBMITTED,
        role: Role.CITIZEN,
        at: '2026-11-20T10:00:00.000Z',
      },
      {
        id: '2',
        status: Status.IN_PROGRESS,
        role: Role.AUTHORITY,
        note: 'Crew is repairing the tarmac',
        at: '2026-11-21T09:00:00.000Z',
      },
    ];
    render(<Timeline events={events} />);
    expect(screen.getByText(/crew is repairing the tarmac/i)).toBeInTheDocument();
    expect(screen.getByText(/municipal officer/i)).toBeInTheDocument();
  });
});
