# Kurse — Platform Ideation

## Overview

A full-stack web platform with two primary audiences:

- **Admins / Instructors** — design and publish interactive, multimedia courses and evaluations
- **Students / Learners** — enroll, take courses, complete evaluations, and track progress

---

## Core Feature Areas

### Admin / Instructor

- Course builder (JSON-driven structure, drag-and-drop optional)
- Media uploads (video, images, documents, audio)
- Evaluation/quiz builder (MCQ, short answer, true/false, file upload)
- Publish/unpublish controls and versioning
- Grade and progress dashboards per course and per student

### Student / Learner

- Auth-gated portal (login, registration)
- Course catalog and enrollment
- Lesson playback and interactive content
- Evaluation submission with auto-grading where applicable
- Personal progress and grade history

---

## Tech Stack Suggestions

### Framework

- **Next.js (App Router)** — already bootstrapped in this repo; ideal for both the public-facing portal and the admin UI via route groups, server actions, and middleware-based auth guards.

### Language

- **TypeScript** throughout.

### Auth

- **NextAuth.js (Auth.js v5)** with a credentials provider and/or OAuth (Google, GitHub). Role field (`ADMIN` | `STUDENT`) stored on the user record. Middleware protects `/admin/*` and `/dashboard/*` route groups.

### Database

- **PostgreSQL** — relational data fits course/enrollment/grade models well.
- ORM: **Drizzle ORM** — SQL-first, type-safe, excellent fit for explicit schema control in Next.js server actions and API routes.
- Migration tooling: **drizzle-kit** for versioned SQL migrations and schema generation.

### File / Media Storage

- **AWS S3** (or Cloudflare R2 as a cost-effective alternative) for video, image, and document assets.
- Signed URLs for secure delivery; optionally integrate a CDN (CloudFront / Cloudflare).
- For video streaming, consider **Mux** or **Cloudflare Stream** to avoid self-hosting transcoding.

### Course Content Rendering

- Course structure lives in JSON (stored in a `jsonb` column in Postgres).
- A renderer component interprets the JSON and dynamically renders the correct block types (video, text, image, quiz, etc.).
- Consider a block schema similar to Notion or Editor.js for extensibility.

### Rich Text / Content Editing

- **Tiptap** or **Editor.js** for WYSIWYG content blocks in the admin builder.

### Background Jobs

- **Inngest** or **BullMQ** (with Redis) for async tasks: grade calculation, enrollment confirmation emails, progress rollups.

### Email

- **Resend** (or SendGrid) for transactional email.

### Deployment

- **Vercel** for the Next.js app; managed **Neon** or **Supabase** for Postgres (both support connection pooling and edge-friendly drivers).

---

## JSON Course Structure — Sketch

```jsonc
{
  "courseId": "uuid",
  "version": 1,
  "title": "Introduction to TypeScript",
  "modules": [
    {
      "moduleId": "uuid",
      "title": "Module 1: Basics",
      "order": 1,
      "lessons": [
        {
          "lessonId": "uuid",
          "title": "What is TypeScript?",
          "order": 1,
          "blocks": [
            { "type": "video", "src": "https://cdn.example.com/intro.mp4" },
            { "type": "richtext", "content": "<p>TypeScript is...</p>" },
            {
              "type": "image",
              "src": "https://cdn.example.com/diagram.png",
              "alt": "TS diagram",
            },
          ],
        },
      ],
      "evaluations": [
        {
          "evalId": "uuid",
          "title": "Module 1 Quiz",
          "scope": "MODULE",
          "passingScore": 70,
          "questions": [
            {
              "questionId": "uuid",
              "type": "mcq", // "mcq" | "true_false" | "short_answer" | "file_upload"
              "prompt": "TypeScript is a superset of…",
              "options": ["JavaScript", "Python", "Java", "C#"],
              "correctAnswer": 0, // index; null for short_answer / file_upload
              "points": 10,
            },
          ],
        },
      ],
    },
  ],
  "courseEvaluations": [
    {
      "evalId": "uuid",
      "title": "Final Exam",
      "scope": "COURSE",
      "passingScore": 70,
      "questions": [
        {
          "questionId": "uuid",
          "type": "mcq", // "mcq" | "true_false" | "short_answer" | "file_upload"
          "prompt": "TypeScript is a superset of…",
          "options": ["JavaScript", "Python", "Java", "C#"],
          "correctAnswer": 0, // index; null for short_answer / file_upload
          "points": 10,
        },
      ],
    },
  ],
}
```

Suggested convention:

- Keep module-specific evaluations inside each module's `evaluations` array.
- Keep final or cross-module assessments in `courseEvaluations`.

Block types to support initially: `video`, `richtext`, `image`, `audio`, `file`, `embed` (iframe), `quiz_inline`.

---

## Database Schema — Proposed Tables

Relational shape:

- `users`: id, email (unique), password_hash, role, name, created_at, updated_at
- `courses`: id, title, slug (unique), description, cover_image_url, structure (jsonb), version, status, created_by_id, created_at, updated_at
- `enrollments`: id, user_id, course_id, enrolled_at, completed_at; unique on (`user_id`, `course_id`)
- `lesson_progress`: id, enrollment_id, lesson_id, completed_at; unique on (`enrollment_id`, `lesson_id`)
- `evaluations`: id, course_id, title, scope, definition (jsonb), passing_score, module_id
- `evaluation_attempts`: id, enrollment_id, evaluation_id, answers (jsonb), score, passed, submitted_at, graded_at
- `grades`: id, enrollment_id, evaluation_id, attempt_id, score, feedback, graded_by_id, created_at

Drizzle conventions to standardize early:

- Use `snake_case` names for tables and columns.
- Define Postgres enums via `pgEnum` for `role`, `course_status`, and `evaluation_scope`.
- Name unique indexes explicitly (for example `enrollments_user_id_course_id_unique`) to make migrations and DB debugging clearer.
- Keep audit fields (`created_at`, `updated_at`) on all primary entities.
- Use `jsonb` for `courses.structure`, `evaluations.definition`, and `evaluation_attempts.answers`.

Drizzle schema sketch (`src/db/schema.ts`):

```ts
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
  varchar,
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
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("STUDENT"),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    usersEmailUnique: uniqueIndex("users_email_unique").on(t.email),
  }),
);

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
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
  (t) => ({
    coursesSlugUnique: uniqueIndex("courses_slug_unique").on(t.slug),
    coursesCreatedByIdx: index("courses_created_by_id_idx").on(t.createdById),
  }),
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
  (t) => ({
    enrollmentsUserCourseUnique: uniqueIndex(
      "enrollments_user_id_course_id_unique",
    ).on(t.userId, t.courseId),
  }),
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => enrollments.id),
    lessonId: varchar("lesson_id", { length: 120 }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    lessonProgressEnrollmentLessonUnique: uniqueIndex(
      "lesson_progress_enrollment_id_lesson_id_unique",
    ).on(t.enrollmentId, t.lessonId),
  }),
);

export const evaluations = pgTable("evaluations", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id),
  title: varchar("title", { length: 180 }).notNull(),
  scope: evaluationScopeEnum("scope").notNull(),
  definition: jsonb("definition").notNull(),
  passingScore: integer("passing_score").notNull().default(70),
  moduleId: varchar("module_id", { length: 120 }),
});

export const evaluationAttempts = pgTable("evaluation_attempts", {
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
});

export const grades = pgTable("grades", {
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
});
```

Migration flow (Drizzle):

- `drizzle-kit generate` after schema changes.
- `drizzle-kit migrate` to apply migrations.
- Keep generated SQL migration files in source control.

Key relationships:

- A `User` can enroll in many `Course`s via `Enrollment`.
- `LessonProgress` rows are keyed by `lessonId` strings from the JSON — no need to mirror the entire JSON hierarchy into relational tables.
- `Evaluation` can belong to a specific module (`scope=MODULE` + `moduleId`) or be course-level (`scope=COURSE`, typically final exam).
- `EvaluationAttempt` stores raw answers as JSONB; a grading job (sync for MCQ/true-false, async for short answer / file upload) writes back `score` and `passed` and creates a `Grade` row.
- `Grade` is separated from `Attempt` to allow instructor override and feedback.

---

## Route Architecture (Next.js App Router)

```
app/
  (public)/
    page.tsx                  -- landing / course catalog
    courses/[slug]/page.tsx   -- course detail
  (auth)/
    login/page.tsx
    register/page.tsx
  (student)/                  -- middleware-protected, role=STUDENT
    dashboard/page.tsx
    courses/[slug]/
      learn/[lessonId]/page.tsx
      eval/[evalId]/page.tsx
  (admin)/                    -- middleware-protected, role=ADMIN
    dashboard/page.tsx
    courses/
      new/page.tsx
      [id]/edit/page.tsx
    students/page.tsx
    grades/page.tsx
```

---

## Open Questions / Future Considerations

- **Versioning**: how to handle students mid-course when the instructor publishes a new version of the JSON structure.
- **Certificates**: auto-generate a PDF certificate on course completion.
- **Discussion / Comments**: per-lesson comment threads or a Q&A forum.
- **Live sessions**: Zoom/Teams embed or built-in video room (e.g. Daily.co).
- **SCORM / xAPI support**: if interoperability with third-party content is needed.
- **Accessibility**: WCAG 2.1 AA compliance for all content blocks and evaluation UI.
- **Multi-tenancy**: single-tenant MVP first; later consider org-scoped deployments.
