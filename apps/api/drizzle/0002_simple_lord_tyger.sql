CREATE TABLE "anon_trial_ips" (
	"ip_hash" text PRIMARY KEY NOT NULL,
	"first_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provider_id" text;