import React, { useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { STRINGS } from '../../content/strings.js';
import { getApiClient } from '../../lib/apiClient.js';
import {
  reportFlowReducer,
  initialReportFlowState,
} from '../../features/citizen/state/reportFlow.js';
import { Stepper } from '../../components/Stepper.js';
import { StepDescribe } from '../../features/citizen/components/StepDescribe.js';
import { StepLocation } from '../../features/citizen/components/StepLocation.js';
import { StepReview } from '../../features/citizen/components/StepReview.js';
import { StepConfirmation } from '../../features/citizen/components/StepConfirmation.js';
import { ErrorState } from '../../components/ErrorState.js';
import { Sparkles, Loader2 } from 'lucide-react';

const STEPS = [
  { id: 1, title: STRINGS.report.step1Title },
  { id: 2, title: STRINGS.report.step2Title },
  { id: 3, title: STRINGS.report.step3Title },
  { id: 4, title: STRINGS.report.step4Title },
] as const;

export function ReportPage(): React.JSX.Element {
  usePageTitle('Report Issue');
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(reportFlowReducer, initialReportFlowState);

  // Analyze report trigger (moves from Step 2 to Step 3)
  const handlePerformAnalysis = async () => {
    dispatch({ type: 'START_ANALYSIS' });
    try {
      const result = await getApiClient().analyzeReport({
        description: state.description,
        location: state.location,
        round: state.round,
      });
      dispatch({ type: 'ANALYSIS_SUCCESS', payload: result });
    } catch (err) {
      dispatch({
        type: 'ANALYSIS_ERROR',
        payload: (err as Error).message || 'Failed to analyze report',
      });
    }
  };

  // Follow-up answer trigger
  const handleAnswerFollowUp = async (answer: string) => {
    dispatch({ type: 'ANSWER_FOLLOW_UP', payload: answer });
    dispatch({ type: 'START_ANALYSIS' });

    try {
      const combinedDescription = `${state.description.trim()}\n\nAdditional details: ${answer.trim()}`;
      const result = await getApiClient().analyzeReport({
        description: combinedDescription,
        location: state.location,
        round: state.round + 1,
      });
      dispatch({ type: 'ANALYSIS_SUCCESS', payload: result });
    } catch (err) {
      dispatch({
        type: 'ANALYSIS_ERROR',
        payload: (err as Error).message || 'Failed to re-analyze report',
      });
    }
  };

  // Final ticket submission
  const handleSubmitReport = async () => {
    dispatch({ type: 'START_SUBMIT' });
    try {
      const submitRes = await getApiClient().submitReport({
        description: state.description,
        location: state.location,
        category_override: state.categoryOverride || undefined,
      });

      if (submitRes.ticket) {
        dispatch({ type: 'SUBMIT_SUCCESS', payload: submitRes.ticket });
      } else {
        // If rejected
        dispatch({
          type: 'ANALYSIS_SUCCESS',
          payload: {
            outcome: submitRes.outcome,
            similar_reports: [],
            meta: submitRes.meta,
          },
        });
      }
    } catch (err) {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload: (err as Error).message || 'Failed to submit grievance',
      });
    }
  };

  // Support existing report shortcut
  const handleSupportExisting = async (ticketId: string) => {
    try {
      await getApiClient().supportTicket(ticketId);
      navigate(`/track/${ticketId}`);
    } catch (err) {
      dispatch({
        type: 'SUBMIT_ERROR',
        payload: (err as Error).message || 'Failed to support existing report',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8" data-testid="report-page">
      {/* Page Header */}
      <div className="space-y-1 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          {STRINGS.report.title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Guided 4-step reporting with instant AI triage and transparent dispatch
        </p>
      </div>

      {/* Stepper Navigation */}
      <div className="py-2">
        <Stepper steps={STEPS} currentStep={state.step} />
      </div>

      {/* Error state if submission or analysis failed */}
      {state.error && (
        <ErrorState
          title="Operation Failed"
          message={state.error}
          onRetry={
            state.step === 2
              ? handlePerformAnalysis
              : state.step === 3
              ? handleSubmitReport
              : undefined
          }
        />
      )}

      {/* Step 1: Describe */}
      {state.step === 1 && (
        <div className="p-6 bg-surface border border-border rounded-xl shadow-subtle">
          <StepDescribe
            value={state.description}
            onChange={(val) => dispatch({ type: 'SET_DESCRIPTION', payload: val })}
            onNext={() => dispatch({ type: 'GO_TO_STEP', payload: 2 })}
          />
        </div>
      )}

      {/* Step 2: Location */}
      {state.step === 2 && (
        <div className="p-6 bg-surface border border-border rounded-xl shadow-subtle">
          {state.isAnalyzing ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="p-4 rounded-full bg-blue-50 text-primary animate-pulse">
                <Sparkles className="w-8 h-8" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-ink">Analyzing Your Report...</h3>
                <p className="text-xs text-slate-500">
                  Checking urgency, sensitive public sites, and nearby duplicate issues
                </p>
              </div>
              <Loader2 className="w-6 h-6 text-primary animate-spin" aria-hidden="true" />
            </div>
          ) : (
            <StepLocation
              value={state.location}
              onChange={(loc) => dispatch({ type: 'SET_LOCATION', payload: loc })}
              onNext={handlePerformAnalysis}
              onBack={() => dispatch({ type: 'GO_TO_STEP', payload: 1 })}
            />
          )}
        </div>
      )}

      {/* Step 3: Review & Confirm */}
      {state.step === 3 && state.analyzeResult && (
        <StepReview
          analysis={state.analyzeResult}
          categoryOverride={state.categoryOverride}
          onCategoryOverrideChange={(cat) =>
            dispatch({ type: 'SET_CATEGORY_OVERRIDE', payload: cat })
          }
          onAnswerFollowUp={handleAnswerFollowUp}
          onSubmitReport={handleSubmitReport}
          onSupportExisting={handleSupportExisting}
          onBack={() => dispatch({ type: 'GO_TO_STEP', payload: 2 })}
          isSubmitting={state.isSubmitting}
        />
      )}

      {/* Step 4: Confirmation / Receipt */}
      {state.step === 4 && state.submittedTicket && (
        <StepConfirmation
          ticket={state.submittedTicket}
          onReset={() => dispatch({ type: 'RESET' })}
        />
      )}
    </div>
  );
}
