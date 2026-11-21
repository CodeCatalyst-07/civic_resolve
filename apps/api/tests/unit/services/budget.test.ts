import { describe, it, expect } from 'vitest';
import { InMemoryDailyAiBudget } from '../../../src/services/budget.js';

describe('Daily AI Request Budget (budget.ts)', () => {
  it('enforces request limit for current day', () => {
    let mockDate = new Date('2026-11-21T10:00:00.000Z');
    const budget = new InMemoryDailyAiBudget({
      dailyLimit: 2,
      nowFn: () => mockDate,
    });

    expect(budget.getLimit()).toBe(2);
    expect(budget.getRemaining()).toBe(2);
    expect(budget.getUsed()).toBe(0);
    expect(budget.canConsume()).toBe(true);

    expect(budget.consume()).toBe(true);
    expect(budget.getUsed()).toBe(1);
    expect(budget.getRemaining()).toBe(1);

    expect(budget.consume()).toBe(true);
    expect(budget.getUsed()).toBe(2);
    expect(budget.getRemaining()).toBe(0);

    // Limit reached
    expect(budget.canConsume()).toBe(false);
    expect(budget.consume()).toBe(false);

    // Rollover to next day at UTC midnight
    mockDate = new Date('2026-11-22T00:00:01.000Z');
    expect(budget.canConsume()).toBe(true);
    expect(budget.getUsed()).toBe(0);
    expect(budget.getRemaining()).toBe(2);
  });
});
