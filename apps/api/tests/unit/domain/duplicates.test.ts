import { describe, it, expect } from 'vitest';
import {
  findDuplicateCandidates,
  tokenizeText,
  jaccardSimilarity,
  type ReportSummary,
} from '../../../src/domain/duplicates.js';
import { Category, Urgency, Status, Department, type Ticket } from '@civicresolve/shared';

describe('Duplicate Candidate Detection (duplicates.ts)', () => {
  const mockNow = new Date('2026-11-21T10:00:00.000Z');
  const tenDaysAgo = new Date('2026-11-11T10:00:00.000Z').toISOString();
  const twentyDaysAgo = new Date('2026-11-01T10:00:00.000Z').toISOString();

  const baseReport: ReportSummary = Object.freeze({
    category: Category.POTHOLE,
    description: 'Huge pothole on 100ft road near signal causing traffic.',
    location: Object.freeze({ lat: 12.9716, lng: 77.5946 }),
  });

  const makeTicket = (overrides: Partial<Ticket> = {}): Ticket => ({
    id: 'CR-AAA11111',
    description: 'Pothole on 100ft road near traffic signal.',
    category: Category.POTHOLE,
    urgency: Urgency.MEDIUM,
    department: Department.ROADS,
    status: Status.SUBMITTED,
    events: [],
    duplicate_count: 0,
    reopen_count: 0,
    created_at: tenDaysAgo,
    due_at: mockNow.toISOString(),
    escalated: false,
    final_decision: {
      urgency: Urgency.MEDIUM,
      category: Category.POTHOLE,
      department: Department.ROADS,
      applied_rules: [],
      emergency_notice: false,
      needs_manual_triage: false,
      ai_suggestion: null,
    },
    attachments: [],
    location: { lat: 12.9718, lng: 77.5948 }, // ~30m away
    ...overrides,
  });

  it('tokenizes text and filters stop words properly', () => {
    const tokens = tokenizeText('The big pothole is on the road near MG road');
    expect(tokens.has('the')).toBe(false);
    expect(tokens.has('is')).toBe(false);
    expect(tokens.has('on')).toBe(false);
    expect(tokens.has('pothole')).toBe(true);
    expect(tokens.has('road')).toBe(true);
    expect(tokens.has('big')).toBe(true);
  });

  it('computes accurate Jaccard similarity', () => {
    const setA = new Set(['pothole', 'road', 'traffic']);
    const setB = new Set(['pothole', 'road', 'signal']);
    // intersection: 2 ('pothole', 'road'), union: 4 ('pothole', 'road', 'traffic', 'signal') -> 0.5
    expect(jaccardSimilarity(setA, setB)).toBe(0.5);

    expect(jaccardSimilarity(new Set(), new Set())).toBe(1.0);
    expect(jaccardSimilarity(new Set(['a']), new Set())).toBe(0.0);
  });

  it('identifies valid duplicate within radius and time window', () => {
    const ticket1 = makeTicket({ id: 'CR-11111111' });
    const candidates = findDuplicateCandidates(baseReport, [ticket1], mockNow);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.ticket.id).toBe('CR-11111111');
    expect(candidates[0]?.distance_m).toBeLessThan(100);
    expect(candidates[0]?.similarity).toBeGreaterThan(0.3);
  });

  it('excludes tickets with mismatched category', () => {
    const garbageTicket = makeTicket({ id: 'CR-22222222', category: Category.GARBAGE });
    const candidates = findDuplicateCandidates(baseReport, [garbageTicket], mockNow);

    expect(candidates).toHaveLength(0);
  });

  it('excludes closed or rejected tickets', () => {
    const closedTicket = makeTicket({ id: 'CR-CLOSED', status: Status.CLOSED });
    const rejectedTicket = makeTicket({ id: 'CR-REJECTED', status: Status.REJECTED });

    const candidates = findDuplicateCandidates(baseReport, [closedTicket, rejectedTicket], mockNow);
    expect(candidates).toHaveLength(0);
  });

  it('excludes tickets older than duplicate window (14 days)', () => {
    const oldTicket = makeTicket({ id: 'CR-OLD', created_at: twentyDaysAgo });
    const candidates = findDuplicateCandidates(baseReport, [oldTicket], mockNow);

    expect(candidates).toHaveLength(0);
  });

  it('excludes tickets outside duplicate radius (150m)', () => {
    const farTicket = makeTicket({
      id: 'CR-FAR',
      location: Object.freeze({ lat: 12.985, lng: 77.61 }), // ~2 km away
    });
    const candidates = findDuplicateCandidates(baseReport, [farTicket], mockNow);

    expect(candidates).toHaveLength(0);
  });

  it('ranks candidates primarily by distance ascending, then by similarity descending', () => {
    const closestTicket = makeTicket({
      id: 'CR-CLOSE',
      location: Object.freeze({ lat: 12.9717, lng: 77.5947 }), // ~15m
      description: 'Minor road defect',
    });

    const mediumTicket = makeTicket({
      id: 'CR-MEDIUM',
      location: Object.freeze({ lat: 12.9722, lng: 77.5952 }), // ~95m
      description: 'Huge pothole on 100ft road near signal causing traffic.', // 1.0 similarity
    });

    const candidates = findDuplicateCandidates(
      baseReport,
      [mediumTicket, closestTicket],
      mockNow
    );

    expect(candidates).toHaveLength(2);
    // Closest distance ranks first even if medium has higher similarity
    expect(candidates[0]?.ticket.id).toBe('CR-CLOSE');
    expect(candidates[1]?.ticket.id).toBe('CR-MEDIUM');
  });

  it('sorts tickets with geographic coordinates ahead of tickets without coordinates', () => {
    const ticketWithLoc = makeTicket({
      id: 'CR-WITH-LOC',
      location: Object.freeze({ lat: 12.9717, lng: 77.5947 }),
      description: 'Pothole on 100ft road',
    });

    const ticketWithoutLoc = makeTicket({
      id: 'CR-WITHOUT-LOC',
      location: undefined,
      description: 'Pothole on 100ft road near signal',
    });

    const reportWithoutLoc: ReportSummary = Object.freeze({
      category: Category.POTHOLE,
      description: 'Pothole on 100ft road',
      location: Object.freeze({ lat: 12.9716, lng: 77.5946 }),
    });

    const candidates = findDuplicateCandidates(
      reportWithoutLoc,
      [ticketWithoutLoc, ticketWithLoc],
      mockNow
    );

    expect(candidates).toHaveLength(2);
    expect(candidates[0]?.ticket.id).toBe('CR-WITH-LOC');
    expect(candidates[0]?.distance_m).not.toBeNull();
    expect(candidates[1]?.ticket.id).toBe('CR-WITHOUT-LOC');
    expect(candidates[1]?.distance_m).toBeNull();
  });

  it('does not mutate input openTickets or report', () => {
    const ticket = makeTicket();
    const tickets = Object.freeze([ticket]);

    findDuplicateCandidates(baseReport, tickets, mockNow);

    expect(tickets).toHaveLength(1);
    expect(ticket.id).toBe('CR-AAA11111');
  });
});
