import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["ADMIN", "STUDENT"]);

export const courseStatusEnum = pgEnum("course_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const evaluationScopeEnum = pgEnum("evaluation_scope", [
  "MODULE",
  "COURSE",
]);

export const organizationRoleEnum = pgEnum("organization_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
]);

export const organizationStatusEnum = pgEnum("organization_status", [
  "ACTIVE",
  "SUSPENDED",
]);

export const organizationInviteStateEnum = pgEnum("organization_invite_state", [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
]);

export const organizationMembershipStateEnum = pgEnum(
  "organization_membership_state",
  ["ACTIVE", "REVOKED"],
);

export const webhookEndpointStatusEnum = pgEnum("webhook_endpoint_status", [
  "ACTIVE",
  "PAUSED",
]);

export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "DEAD_LETTER",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("STUDENT"),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    coverImageUrl: text("cover_image_url"),
    structure: jsonb("structure").notNull(),
    version: integer("version").notNull().default(1),
    status: courseStatusEnum("status").notNull().default("DRAFT"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("courses_slug_unique").on(table.slug),
    index("courses_created_by_id_idx").on(table.createdById),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("enrollments_user_id_course_id_unique").on(
      table.userId,
      table.courseId,
    ),
  ],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id),
    lessonId: text("lesson_id").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("lesson_progress_enrollment_id_lesson_id_unique").on(
      table.enrollmentId,
      table.lessonId,
    ),
  ],
);

export const evaluations = pgTable(
  "evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id),
    title: text("title").notNull(),
    scope: evaluationScopeEnum("scope").notNull(),
    definition: jsonb("definition").notNull(),
    passingScore: integer("passing_score").notNull().default(70),
    moduleId: text("module_id"),
  },
  (table) => [
    index("evaluations_course_id_idx").on(table.courseId),
    index("evaluations_scope_idx").on(table.scope),
  ],
);

export const evaluationAttempts = pgTable(
  "evaluation_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id),
    answers: jsonb("answers").notNull(),
    score: real("score"),
    passed: boolean("passed"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
  },
  (table) => [
    index("evaluation_attempts_enrollment_id_idx").on(table.enrollmentId),
    index("evaluation_attempts_evaluation_id_idx").on(table.evaluationId),
  ],
);

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => evaluations.id),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => evaluationAttempts.id),
    score: real("score").notNull(),
    feedback: text("feedback"),
    gradedById: uuid("graded_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("grades_enrollment_id_idx").on(table.enrollmentId),
    index("grades_evaluation_id_idx").on(table.evaluationId),
    uniqueIndex("grades_attempt_id_unique").on(table.attemptId),
  ],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id),
    status: organizationStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [uniqueIndex("organizations_slug_unique").on(table.slug)],
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: organizationRoleEnum("role").notNull().default("MEMBER"),
    state: organizationMembershipStateEnum("state").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("organization_memberships_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
    index("organization_memberships_organization_id_idx").on(
      table.organizationId,
    ),
    index("organization_memberships_user_id_idx").on(table.userId),
    index("organization_memberships_state_idx").on(table.state),
  ],
);

export const organizationSeatLedger = pgTable(
  "organization_seat_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("organization_seat_ledger_organization_id_idx").on(
      table.organizationId,
    ),
  ],
);

export const organizationInvites = pgTable(
  "organization_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    email: text("email").notNull(),
    role: organizationRoleEnum("role").notNull().default("MEMBER"),
    state: organizationInviteStateEnum("state").notNull().default("PENDING"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("organization_invites_organization_id_idx").on(table.organizationId),
    index("organization_invites_email_idx").on(table.email),
    uniqueIndex("organization_invites_token_hash_unique").on(table.tokenHash),
  ],
);

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    url: text("url").notNull(),
    secretHash: text("secret_hash").notNull(),
    status: webhookEndpointStatusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("webhook_endpoints_organization_id_idx").on(table.organizationId),
  ],
);

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id),
    eventType: text("event_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("webhook_subscriptions_endpoint_event_type_unique").on(
      table.endpointId,
      table.eventType,
    ),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventType: text("event_type").notNull(),
    version: text("version").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    payloadJson: jsonb("payload_json").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("webhook_events_event_type_idx").on(table.eventType),
    index("webhook_events_organization_id_idx").on(table.organizationId),
    index("webhook_events_occurred_at_idx").on(table.occurredAt),
  ],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => webhookEvents.id),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id),
    attempt: integer("attempt").notNull().default(1),
    status: webhookDeliveryStatusEnum("status").notNull().default("PENDING"),
    responseCode: integer("response_code"),
    responseBodySnippet: text("response_body_snippet"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("webhook_deliveries_event_id_idx").on(table.eventId),
    index("webhook_deliveries_endpoint_id_idx").on(table.endpointId),
    index("webhook_deliveries_status_idx").on(table.status),
  ],
);
