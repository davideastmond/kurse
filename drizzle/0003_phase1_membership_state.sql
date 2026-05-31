CREATE TYPE "public"."organization_membership_state" AS ENUM('ACTIVE', 'REVOKED');--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD COLUMN "state" "organization_membership_state" DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
CREATE INDEX "organization_memberships_state_idx" ON "organization_memberships" USING btree ("state");