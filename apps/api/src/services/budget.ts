export interface DailyAiBudget {
  canConsume(): boolean;
  consume(): boolean;
  getRemaining(): number;
  getUsed(): number;
  getLimit(): number;
}

export interface BudgetOptions {
  readonly dailyLimit: number;
  readonly nowFn?: () => Date;
}

/**
 * In-memory tracker for daily AI provider inference request quotas.
 * Automatically resets count at 00:00:00 UTC.
 *
 * NOTE: In serverless environments, this quota tracker operates per instance.
 * Later phases can replace this with a centralized Firestore transaction counter
 * implementing the same DailyAiBudget interface.
 */
export class InMemoryDailyAiBudget implements DailyAiBudget {
  private readonly limit: number;
  private readonly now: () => Date;
  private currentDayUtc: string;
  private usedCount = 0;

  public constructor(options: BudgetOptions) {
    this.limit = options.dailyLimit;
    this.now = options.nowFn ?? (() => new Date());
    this.currentDayUtc = this.formatUtcDate(this.now());
  }

  private formatUtcDate(date: Date): string {
    return date.toISOString().slice(0, 10); // YYYY-MM-DD in UTC
  }

  private checkRollover(): void {
    const today = this.formatUtcDate(this.now());
    if (today !== this.currentDayUtc) {
      this.currentDayUtc = today;
      this.usedCount = 0;
    }
  }

  public canConsume(): boolean {
    this.checkRollover();
    return this.usedCount < this.limit;
  }

  public consume(): boolean {
    this.checkRollover();
    if (this.usedCount >= this.limit) {
      return false;
    }
    this.usedCount++;
    return true;
  }

  public getRemaining(): number {
    this.checkRollover();
    return Math.max(0, this.limit - this.usedCount);
  }

  public getUsed(): number {
    this.checkRollover();
    return this.usedCount;
  }

  public getLimit(): number {
    return this.limit;
  }
}
