import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  isAdmin: boolean('is_admin').notNull().default(false),
  /** Hard block: set by admin. Blocked users can sign in but can't spend
   *  credits, buy packages, or generate. */
  isBlocked: boolean('is_blocked').notNull().default(false),
  /** Marked automatically when the user registered from an IP that already
   *  claimed the signup bonus. The cabinet shows a warning banner. */
  isSuspicious: boolean('is_suspicious').notNull().default(false),
  /** "vk" | "telegram" | null for email signups */
  provider: text('provider'),
  /** External id from the OAuth provider (vk user id, telegram user id). */
  providerId: text('provider_id'),
  /** Phone number in E.164 format when we can obtain it (VK ID scope=phone).
   *  Used for cross-provider deduplication. */
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per IP hash that has already received the signup bonus. Stops a
 * single human from farming N × SIGNUP_BONUS_CREDITS by registering via
 * email + VK + Telegram separately.
 */
export const signupBonusIps = pgTable('signup_bonus_ips', {
  ipHash: text('ip_hash').primaryKey(),
  firstUserId: uuid('first_user_id'),
  provider: text('provider'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Runtime-editable configuration: AI prompts (SYSTEM_ANALYST / SYSTEM_WRITER)
 * and an optional OpenAI API key override. Anything missing here falls back
 * to env / compile-time defaults so the app keeps working with an empty
 * table.
 */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Free-text messages submitted via the cabinet "contact support" form. */
export const supportMessages = pgTable('support_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  body: text('body').notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  credits: integer('credits').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per IP that consumed the anonymous free-trial credit. Blocks the
 * "clear cookies + incognito" abuse loop — same IP gets 0 credits on the
 * second anon session, only registration (or paid purchase) grants more.
 */
export const anonTrialIps = pgTable('anon_trial_ips', {
  ipHash: text('ip_hash').primaryKey(),
  firstSessionId: uuid('first_session_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  yookassaPaymentId: text('yookassa_payment_id').notNull().unique(),
  packageId: text('package_id').notNull(),
  credits: integer('credits').notNull(),
  amountRub: integer('amount_rub').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const generations = pgTable('generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  resultId: text('result_id').notNull(),
  vacancyTitle: text('vacancy_title'),
  vacancyCompany: text('vacancy_company'),
  resumeTitle: text('resume_title'),
  kind: text('kind').notNull(),
  model: text('model').notNull(),
  durationMs: integer('duration_ms').notNull(),
  /** Full GenerateResult payload. Stored here so results survive Redis TTL
   *  and profile history can render them later. */
  resultJson: jsonb('result_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const errorLogs = pgTable('error_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  code: text('code').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;
export type ErrorLog = typeof errorLogs.$inferSelect;
