import React from 'react';
import type { Status, Role } from '@civicresolve/shared';
import { StatusPill } from './StatusPill.js';
import { formatDateTime } from '../lib/formatters.js';

export interface TimelineEventItem {
  readonly id: string;
  readonly status: Status;
  readonly role: Role;
  readonly note?: string;
  readonly at: string;
}

export interface TimelineProps {
  events: readonly TimelineEventItem[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ events, className = '' }) => {
  if (!events || events.length === 0) {
    return null;
  }

  // Display most recent event first or chronological?
  // Standards: chronological order (oldest to newest) with line connector
  return (
    <div className={`relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border ${className}`}>
      {events.map((evt, idx) => {
        const isLatest = idx === events.length - 1;

        return (
          <div key={evt.id || idx} className="relative flex flex-col gap-1.5 text-sm">
            {/* Timeline node circle */}
            <span
              className={`absolute -left-6 top-1 flex items-center justify-center w-5 h-5 rounded-full border-2 bg-surface ${
                isLatest ? 'border-primary ring-2 ring-blue-100' : 'border-slate-400'
              }`}
              aria-hidden="true"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLatest ? 'bg-primary' : 'bg-slate-400'
                }`}
              />
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={evt.status} />
              <span className="text-xs text-slate-500 font-medium">
                by {evt.role === 'authority' ? 'Municipal Officer' : 'Citizen'}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <time
                dateTime={evt.at}
                className="text-xs text-slate-500 tabular-nums"
              >
                {formatDateTime(evt.at)}
              </time>
            </div>

            {evt.note && (
              <p className="mt-1 text-ink bg-page p-3 rounded-md border border-border text-sm leading-relaxed">
                {evt.note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
