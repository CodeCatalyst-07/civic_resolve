import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isValidTicketId } from '@civicresolve/shared';
import { STRINGS } from '../../content/strings.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { PublicStatsStrip } from '../../features/citizen/components/PublicStatsStrip.js';
import { RecentReportsList } from '../../features/citizen/components/RecentReportsList.js';
import {
  FileText,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function HomePage(): React.JSX.Element {
  usePageTitle('Home');
  const navigate = useNavigate();

  const [ticketInput, setTicketInput] = useState('');
  const [ticketError, setTicketError] = useState<string | null>(null);

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = ticketInput.trim().toUpperCase();

    if (!cleaned) {
      setTicketError('Please enter a ticket code');
      return;
    }

    if (!isValidTicketId(cleaned)) {
      setTicketError('Please enter a valid 8-character code like CR-7X2K9M4P');
      return;
    }

    setTicketError(null);
    navigate(`/track/${cleaned}`);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section aria-labelledby="hero-title" className="text-center max-w-3xl mx-auto space-y-4 pt-4 sm:pt-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-primary border border-blue-200 mb-2">
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>AI-Assisted Citizen Portal</span>
        </div>

        <h1 id="hero-title" className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight">
          {STRINGS.home.heroTitle}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {STRINGS.home.heroSubtitle}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link
            to="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white bg-primary hover:bg-blue-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            {STRINGS.home.fileButton}
          </Link>

          <Link
            to="/track"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-ink bg-surface border border-border hover:bg-page transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Search className="w-4 h-4 text-slate-500" aria-hidden="true" />
            {STRINGS.home.trackButton}
          </Link>
        </div>
      </section>

      {/* Track Box Section */}
      <section aria-labelledby="track-box-title" className="max-w-xl mx-auto">
        <div className="p-6 bg-surface border border-border rounded-xl shadow-subtle space-y-3">
          <div className="flex items-center gap-2 text-ink">
            <Search className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 id="track-box-title" className="text-base font-bold">
              {STRINGS.home.trackBoxTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            {STRINGS.home.trackBoxDescription}
          </p>

          <form onSubmit={handleTrackSubmit} className="space-y-2 pt-1">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={ticketInput}
                  onChange={(e) => {
                    setTicketInput(e.target.value.toUpperCase());
                    if (ticketError) setTicketError(null);
                  }}
                  placeholder={STRINGS.home.trackInputPlaceholder}
                  maxLength={11}
                  className="w-full px-3 py-2 text-sm font-mono uppercase bg-page border border-border rounded-lg text-ink focus-visible:outline-2 focus-visible:outline-primary"
                  aria-invalid={!!ticketError}
                  aria-describedby={ticketError ? 'track-error-msg' : undefined}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-700 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              >
                {STRINGS.home.trackSubmitButton}
              </button>
            </div>

            {ticketError && (
              <p id="track-error-msg" role="alert" className="text-xs font-medium text-red-700 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{ticketError}</span>
              </p>
            )}
          </form>
        </div>
      </section>

      {/* How It Works */}
      <section aria-labelledby="how-it-works-title" className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 id="how-it-works-title" className="text-xl sm:text-2xl font-bold text-ink">
            {STRINGS.home.howItWorksTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Transparent resolution from first report to verified completion
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STRINGS.home.howItWorksSteps.map((step) => (
            <div
              key={step.step}
              className="p-5 bg-surface border border-border rounded-xl shadow-subtle space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-primary font-bold text-sm">
                  {step.step}
                </span>
                {step.step === 1 && <FileText className="w-5 h-5 text-slate-400" aria-hidden="true" />}
                {step.step === 2 && <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />}
                {step.step === 3 && <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />}
              </div>
              <h3 className="text-sm font-bold text-ink">{step.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Public Stats Strip */}
      <PublicStatsStrip />

      {/* Recent Reports List */}
      <RecentReportsList />
    </div>
  );
}
