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
