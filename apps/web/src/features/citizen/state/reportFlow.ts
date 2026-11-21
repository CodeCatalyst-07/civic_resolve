import type {
  Category,
  LocationInput,
  AnalyzeResult,
  PublicTicketView,
} from '@civicresolve/shared';

export type ReportStep = 1 | 2 | 3 | 4;

export interface ReportFlowState {
  readonly step: ReportStep;
  readonly description: string;
  readonly location: LocationInput;
  readonly round: number;
  readonly analyzeResult: AnalyzeResult | null;
  readonly categoryOverride: Category | null;
  readonly submittedTicket: PublicTicketView | null;
  readonly isAnalyzing: boolean;
  readonly isSubmitting: boolean;
  readonly error: string | null;
}

export type ReportFlowAction =
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_LOCATION'; payload: Partial<LocationInput> }
  | { type: 'GO_TO_STEP'; payload: ReportStep }
  | { type: 'START_ANALYSIS' }
  | { type: 'ANALYSIS_SUCCESS'; payload: AnalyzeResult }
  | { type: 'ANALYSIS_ERROR'; payload: string }
  | { type: 'SET_CATEGORY_OVERRIDE'; payload: Category | null }
  | { type: 'ANSWER_FOLLOW_UP'; payload: string }
  | { type: 'START_SUBMIT' }
  | { type: 'SUBMIT_SUCCESS'; payload: PublicTicketView }
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'RESET' };

export const initialReportFlowState: ReportFlowState = {
  step: 1,
  description: '',
  location: {},
  round: 0,
  analyzeResult: null,
  categoryOverride: null,
  submittedTicket: null,
  isAnalyzing: false,
  isSubmitting: false,
  error: null,
};

export function reportFlowReducer(
  state: ReportFlowState,
  action: ReportFlowAction
): ReportFlowState {
  switch (action.type) {
    case 'SET_DESCRIPTION':
      return {
        ...state,
        description: action.payload,
        error: null,
      };

    case 'SET_LOCATION':
      return {
        ...state,
        location: {
          ...state.location,
          ...action.payload,
        },
        error: null,
      };

    case 'GO_TO_STEP':
      return {
        ...state,
        step: action.payload,
        error: null,
      };

    case 'START_ANALYSIS':
      return {
        ...state,
        isAnalyzing: true,
        error: null,
      };

    case 'ANALYSIS_SUCCESS':
      return {
        ...state,
        isAnalyzing: false,
        analyzeResult: action.payload,
        step: 3,
        error: null,
      };

    case 'ANALYSIS_ERROR':
      return {
        ...state,
        isAnalyzing: false,
        error: action.payload,
      };

    case 'SET_CATEGORY_OVERRIDE':
      return {
        ...state,
        categoryOverride: action.payload,
      };

    case 'ANSWER_FOLLOW_UP':
      return {
        ...state,
        description: `${state.description.trim()}\n\nAdditional details: ${action.payload.trim()}`,
        round: state.round + 1,
      };

    case 'START_SUBMIT':
      return {
        ...state,
        isSubmitting: true,
        error: null,
      };

    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        isSubmitting: false,
        submittedTicket: action.payload,
        step: 4,
        error: null,
      };

    case 'SUBMIT_ERROR':
      return {
        ...state,
        isSubmitting: false,
        error: action.payload,
      };

    case 'RESET':
      return initialReportFlowState;

    default:
      return state;
  }
}
