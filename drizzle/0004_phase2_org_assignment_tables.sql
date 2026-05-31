CREATE TABLE "organization_course_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_member_course_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"source_assignment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_course_assignments" ADD CONSTRAINT "organization_course_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_course_assignments" ADD CONSTRAINT "organization_course_assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_course_assignments" ADD CONSTRAINT "organization_course_assignments_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_course_assignments" ADD CONSTRAINT "organization_member_course_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_course_assignments" ADD CONSTRAINT "organization_member_course_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_course_assignments" ADD CONSTRAINT "organization_member_course_assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_member_course_assignments" ADD CONSTRAINT "organization_member_course_assignments_source_assignment_id_organization_course_assignments_id_fk" FOREIGN KEY ("source_assignment_id") REFERENCES "public"."organization_course_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_course_assignments_org_course_unique" ON "organization_course_assignments" USING btree ("organization_id","course_id");--> statement-breakpoint
CREATE INDEX "organization_course_assignments_organization_id_idx" ON "organization_course_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_course_assignments_course_id_idx" ON "organization_course_assignments" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_member_course_assignments_org_user_course_unique" ON "organization_member_course_assignments" USING btree ("organization_id","user_id","course_id");--> statement-breakpoint
CREATE INDEX "organization_member_course_assignments_organization_id_idx" ON "organization_member_course_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_member_course_assignments_user_id_idx" ON "organization_member_course_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_member_course_assignments_course_id_idx" ON "organization_member_course_assignments" USING btree ("course_id");