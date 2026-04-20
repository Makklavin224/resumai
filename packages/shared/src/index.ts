// Single-file exports to keep Turbopack (Next.js) and NodeNext (Fastify)
// module resolution happy for this workspace package.

// ============================ Types ============================

export type ResumeInputType = 'url' | 'text' | 'pdf';
export type VacancyInputType = 'url' | 'text';

export interface GenerateTextInput {
  resume: { type: 'url'; value: string } | { type: 'text'; value: string };
  vacancy: { type: 'url'; value: string } | { type: 'text'; value: string };
}

export type GapCategory =
  | 'positioning'
  | 'achievements'
  | 'skills'
  | 'industry'
  | 'format'
  | 'credibility'
  | 'ats'
  | 'risk'
  | 'code_word';

export type Priority = 'high' | 'medium' | 'low';
export type ImpactLayer = 'ats' | 'recruiter' | 'hiring_manager';
export type SignalType = 'must_have' | 'should_have' | 'nice_to_have';
export type SignalLayer =
  | 'hard_skill'
  | 'tool'
  | 'domain'
  | 'metric'
  | 'soft'
  | 'credential'
  | 'hidden';
export type RiskSeverity = 'critical' | 'high' | 'medium';
export type StrategyKey = 'safe' | 'bold' | 'stretch';

export interface Gap {
  /** Short title of the missing skill / mismatch */
  title: string;
  /** 1–2 sentence explanation of why it matters */
  rationale: string;
  /** Concrete suggested bullet to add to the resume (copy-paste ready) */
  suggestedBullet: string;
  /** Semantic bucket for the gap. Added in prompts v3.0. */
  category?: GapCategory;
  /** Urgency of applying the fix. */
  priority?: Priority;
  /** Which reader layer this fix targets: ATS, recruiter skim, or hiring manager. */
  impactLayer?: ImpactLayer;
  /** Literal "before / after" text transformation the candidate should apply. */
  beforeAfter?: { before: string; after: string };
  /** Exact spot in the resume to apply the fix. */
  howToApply?: string;
}

export interface Match {
  /** Aspect of the resume that aligns with the vacancy */
  title: string;
  /** 1-sentence explanation of why it's a match */
  detail: string;
  /** Relevance score 0-100 */
  score: number;
  /** One phrase the candidate should drop into the first line of the response. */
  howToHighlight?: string;
  /** How to further strengthen this match in the resume. */
  leverage?: string;
}

export interface Signal {
  keyword: string;
  type: SignalType;
  layer: SignalLayer;
  /** 0–100: how well the resume covers this signal. */
  coverage: number;
}

export interface RejectionRisk {
  risk: string;
  severity: RiskSeverity;
  mitigation: string;
}

export interface ResponseStrategy {
  description: string;
  interviewProbability: number;
  whenToUse: string;
}

export interface InterviewProbability {
  value: number;
  explanation: string;
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
  // ----- Prompts v3.0 enrichment. All optional so old cached results
  // (Redis TTL 1h) and older model responses don't break the client. -----
  profileSnapshot?: string;
  recruiterInnerMonologue?: string;
  targetPositioning?: string;
  recruiterHook?: string;
  codeWord?: string | null;
  coverageScore?: number;
  interviewProbability?: InterviewProbability;
  signals?: Signal[];
  redFlags?: string[];
  greenFlags?: string[];
  rejectionRisks?: RejectionRisk[];
  responseStrategy?: Record<StrategyKey, ResponseStrategy>;
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
  { id: 'pack_10', label: '+10 откликов', credits: 10, priceRub: 99 },
  {
    id: 'pack_30',
    label: '+30 откликов',
    credits: 30,
    priceRub: 249,
    badge: 'ХИТ',
    popular: true,
  },
  { id: 'pack_100', label: '+100 откликов', credits: 100, priceRub: 699 },
  { id: 'pack_250', label: '+250 откликов', credits: 250, priceRub: 1490 },
] as const;

/** One-time bonus granted when a user first signs up. */
export const SIGNUP_BONUS_CREDITS = 3;

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
