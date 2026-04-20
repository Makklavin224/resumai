export type ResumeInputType = 'url' | 'text' | 'pdf';
export type VacancyInputType = 'url' | 'text';

export interface GenerateTextInput {
  resume:
    | { type: 'url'; value: string }
    | { type: 'text'; value: string };
  vacancy:
    | { type: 'url'; value: string }
    | { type: 'text'; value: string };
}

export interface Gap {
  /** Short title of the missing skill / mismatch */
  title: string;
  /** 1–2 sentence explanation of why it matters */
  rationale: string;
  /** Concrete suggested bullet to add to the resume */
  suggestedBullet: string;
}

export interface Match {
  /** Aspect of the resume that aligns with the vacancy */
  title: string;
  /** 1-sentence explanation of why it's a match */
  detail: string;
  /** Relevance score 0-100 */
  score: number;
}

export interface GenerateResult {
  resultId: string;
  gaps: Gap[];
  matches: Match[];
  coverLetter: string;
  previewCoverLetter: string;
  /** "full" if credits were deducted, "preview" if paywalled */
  kind: 'full' | 'preview';
  creditsRemaining: number;
  model: string;
  tokensUsed: number;
  durationMs: number;
}

export interface CreditPackage {
  id: string;
  label: string;
  credits: number;
  priceRub: number;
  badge?: string;
  popular?: boolean;
}

export type GenerateStep =
  | 'queued'
  | 'parsing-vacancy'
  | 'parsing-resume'
  | 'matching'
  | 'writing-letter'
  | 'done'
  | 'error';

export interface GenerateSseEvent {
  step: GenerateStep;
  message?: string;
  result?: GenerateResult;
  errorCode?: string;
}

export interface SessionInfo {
  sessionId: string;
  credits: number;
}

export interface PaymentCreateResult {
  paymentId: string;
  confirmationUrl: string;
}

export interface ApiError {
  error: string;
  code:
    | 'INVALID_INPUT'
    | 'PARSE_URL_FAILED'
    | 'PARSE_PDF_FAILED'
    | 'AI_ERROR'
    | 'RATE_LIMIT'
    | 'PAYMENT_ERROR'
    | 'INTERNAL';
  details?: unknown;
}
