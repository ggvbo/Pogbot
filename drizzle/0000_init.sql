CREATE TABLE "scores" (
	"id" text PRIMARY KEY NOT NULL,
	"score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" text PRIMARY KEY NOT NULL,
	"triggers" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"channels" text[] DEFAULT ARRAY[]::text[] NOT NULL
);
