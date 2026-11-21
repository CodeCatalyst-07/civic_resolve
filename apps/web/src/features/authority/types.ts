import type {
  Status,
  Category,
  Urgency,
  AuthorityTicketView,
} from '@civicresolve/shared';

export interface QueueFilters {
  status?: Status;
  category?: Category;
  ward?: string;
  urgency?: Urgency;
  overdue?: boolean;
  cursor?: string;
  limit?: number;
}

export type AuthorityQueueItem = AuthorityTicketView;

export interface DecisionChange {
  field: 'Urgency' | 'Category' | 'Department';
  from: string;
  to: string;
  author: 'automatic' | 'staff';
  reason?: string;
}

export interface TargetSlaStatus {
  label: string;
  overdue: boolean;
}
