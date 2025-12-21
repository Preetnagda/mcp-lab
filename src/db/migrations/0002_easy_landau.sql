CREATE TABLE "oauth_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"registration_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_clients_issuer_unique" UNIQUE("issuer")
);
--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "encrypted_access_token" text;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "encrypted_refresh_token" text;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "mcp_servers" ADD COLUMN "token_type" text;