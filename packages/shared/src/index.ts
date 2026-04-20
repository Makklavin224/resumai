// Single-file exports to keep Turbopack (Next.js) and NodeNext (Fastify)
// module resolution happy for this workspace package.

// ============================ Types ============================

export type ResumeInputType = 'url' | 'text' | 'pdf';
export type VacancyInputType = 'url' | 'text';

export interface GenerateTextInput {
  resume: { type: 'url'; value: string } | { type: 'text'; value: string };
  vacancy: { type: 'url'; value: string } | { type: 'text'; value: string };
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

// ========================= Constants ==========================

export const CREDIT_PACKAGES: readonly CreditPackage[] = [
  { id: 'trial', label: 'Старт', credits: 1, priceRub: 0 },
  { id: 'pack_10', label: '+10 откликов', credits: 10, priceRub: 149 },
  {
    id: 'pack_30',
    label: '+30 откликов',
    credits: 30,
    priceRub: 399,
    badge: 'ХИТ',
    popular: true,
  },
  { id: 'pack_50', label: '+50 откликов', credits: 50, priceRub: 599 },
  { id: 'pack_100', label: '+100 откликов', credits: 100, priceRub: 999 },
] as const;

/** One-time bonus granted when a user first signs up. */
export const SIGNUP_BONUS_CREDITS = 2;

export const LIMITS = {
  resumeTextMin: 200,
  resumeTextMax: 50_000,
  vacancyTextMin: 200,
  vacancyTextMax: 50_000,
  pdfMaxBytes: 10 * 1024 * 1024,
  pdfMaxPages: 20,
  coverLetterMinWords: 120,
  coverLetterMaxWords: 180,
  generateTimeoutMs: 120_000,
  aiRetryCount: 2,
} as const;

export const HH_URL_REGEX =
  /^https?:\/\/(?:(?:[a-z]{2,4}\.)?hh\.ru|rabota\.yandex\.ru)\/(?:vacancy|resume)\/[A-Za-z0-9_-]+/i;
