import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { STRINGS } from '../../../content/strings.js';
import { RotateCcw, X } from 'lucide-react';
import { FieldError } from '../../../components/FieldError.js';

export interface ReopenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  onConfirmReopen: (note: string) => Promise<void>;
}

export const ReopenDialog: React.FC<ReopenDialogProps> = ({
  open,
  onOpenChange,
  ticketId,
  onConfirmReopen,
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = note.trim();
    if (trimmed.length < 5) {
      setError('Please provide an explanatory note (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirmReopen(trimmed);
      setNote('');
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to reopen grievance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-surface p-6 shadow-xl border border-border focus:outline-none"
          aria-describedby="reopen-dialog-description"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <Dialog.Title className="text-base font-bold text-ink flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-urgency-high" aria-hidden="true" />
              {STRINGS.track.reopenModalTitle}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-400 hover:text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <p id="reopen-dialog-description" className="mt-3 text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-ink">Ticket #{ticketId}: </span>
            {STRINGS.track.reopenModalDescription}
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reopen-note-input" className="text-xs font-semibold text-ink">
                {STRINGS.track.reopenNoteLabel}
              </label>
              <textarea
                id="reopen-note-input"
                rows={4}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={STRINGS.track.reopenNotePlaceholder}
                className="w-full p-2.5 text-xs rounded-md border border-border bg-surface text-ink leading-relaxed focus-visible:outline-2 focus-visible:outline-primary"
                required
              />
              <FieldError error={error} />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-ink hover:bg-page focus-visible:outline-2 focus-visible:outline-primary"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-urgency-high text-white hover:bg-orange-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{isSubmitting ? 'Reopening...' : STRINGS.track.reopenSubmitButton}</span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
