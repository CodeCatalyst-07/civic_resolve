import { describe, it, expect } from 'vitest';
import {
  reportFlowReducer,
  initialReportFlowState,
  type ReportFlowState,
} from './reportFlow.js';
import { Category, Urgency } from '@civicresolve/shared';

describe('ReportFlow State Machine', () => {
  it('initializes at step 1 with empty state', () => {
    expect(initialReportFlowState.step).toBe(1);
    expect(initialReportFlowState.description).toBe('');
    expect(initialReportFlowState.round).toBe(0);
    expect(initialReportFlowState.analyzeResult).toBeNull();
  });

  it('updates description and clears error', () => {
    const s1 = reportFlowReducer(initialReportFlowState, {
      type: 'SET_DESCRIPTION',
      payload: 'Deep pothole on MG Road near signal.',
    });
    expect(s1.description).toBe('Deep pothole on MG Road near signal.');
  });

  it('updates location properties immutably', () => {
    const s1 = reportFlowReducer(initialReportFlowState, {
      type: 'SET_LOCATION',
      payload: { ward: 'Ward 10', address: '123 Main Street' },
    });
    expect(s1.location.ward).toBe('Ward 10');
    expect(s1.location.address).toBe('123 Main Street');

    const s2 = reportFlowReducer(s1, {
      type: 'SET_LOCATION',
      payload: { lat: 12.9716, lng: 77.5946 },
    });
    expect(s2.location.ward).toBe('Ward 10');
    expect(s2.location.lat).toBe(12.9716);
    expect(s2.location.lng).toBe(77.5946);
  });

  it('transitions to step 3 on successful analysis', () => {
    const mockAnalysis = {
      outcome: {
        kind: 'ticket' as const,
        decision: {
          category: Category.POTHOLE,
          urgency: Urgency.HIGH,
          department: 'roads' as const,
          applied_rules: [],
          emergency_notice: false,
          needs_manual_triage: false,
          ai_suggestion: null,
        },
        needs_manual_triage: false,
        emergency_notice: false,
      },
      similar_reports: [],
      meta: {
        ai_source: 'gemini' as const,
        degraded: false,
      },
    };

    const s1 = reportFlowReducer(initialReportFlowState, { type: 'START_ANALYSIS' });
    expect(s1.isAnalyzing).toBe(true);

    const s2 = reportFlowReducer(s1, {
      type: 'ANALYSIS_SUCCESS',
      payload: mockAnalysis,
    });
    expect(s2.isAnalyzing).toBe(false);
    expect(s2.step).toBe(3);
    expect(s2.analyzeResult).toEqual(mockAnalysis);
  });

  it('appends follow-up answers and increments round', () => {
    const base: ReportFlowState = {
      ...initialReportFlowState,
      description: 'Pothole on main road.',
      round: 0,
    };

    const s1 = reportFlowReducer(base, {
      type: 'ANSWER_FOLLOW_UP',
      payload: 'Near landmark XYZ school.',
    });
    expect(s1.description).toContain('Pothole on main road.');
    expect(s1.description).toContain('Near landmark XYZ school.');
    expect(s1.round).toBe(1);
  });

  it('sets category override without altering urgency', () => {
    const s1 = reportFlowReducer(initialReportFlowState, {
      type: 'SET_CATEGORY_OVERRIDE',
      payload: Category.GARBAGE,
    });
    expect(s1.categoryOverride).toBe(Category.GARBAGE);
  });

  it('transitions to step 4 on submit success', () => {
    const mockTicket = {
      id: 'CR-7X2K9M4P',
      status: 'submitted' as const,
      category: Category.POTHOLE,
      urgency: Urgency.HIGH,
      department: 'Roads & Infrastructure',
      summary: 'Pothole on MG Road',
      ward: 'Ward 1',
      created_at: new Date().toISOString(),
      due_at: new Date().toISOString(),
      overdue: false,
      duplicate_count: 0,
      reasons: [],
      applied_rules: [],
      timeline: [],
      emergency_notice: false,
    };

    const s1 = reportFlowReducer(initialReportFlowState, { type: 'START_SUBMIT' });
    expect(s1.isSubmitting).toBe(true);

    const s2 = reportFlowReducer(s1, {
      type: 'SUBMIT_SUCCESS',
      payload: mockTicket,
    });
    expect(s2.isSubmitting).toBe(false);
    expect(s2.step).toBe(4);
    expect(s2.submittedTicket?.id).toBe('CR-7X2K9M4P');
  });

  it('resets back to step 1 on RESET', () => {
    const dirtyState: ReportFlowState = {
      step: 4,
      description: 'Done',
      location: { ward: 'W1' },
      round: 2,
      analyzeResult: null,
      categoryOverride: Category.POTHOLE,
      submittedTicket: null,
      isAnalyzing: false,
      isSubmitting: false,
      error: 'some error',
    };

    const reset = reportFlowReducer(dirtyState, { type: 'RESET' });
    expect(reset).toEqual(initialReportFlowState);
  });
});
