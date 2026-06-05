"use server";

import { enqueueWebhookEvent } from "@/app/actions/webhooks";
import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import {
  courses,
  enrollments,
  evaluationAttempts,
  evaluations,
  grades,
  lessonProgress,
} from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type SeededCourseStructure = {
  courseId?: string;
  courseEvaluation?: ApiCoursePayload["courseEvaluation"];
  modules?: ApiCoursePayload["modules"];
  metadata?: Record<string, string | undefined>;
};

type CompleteLessonInput = {
  enrollmentId: string;
  courseRecordId: string;
  lessonId: string;
  courseSlug: string;
};

type CompleteLessonResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

export async function completeLessonProgress(
  input: CompleteLessonInput,
): Promise<CompleteLessonResult> {
  const session = await getSessionSafely();
  const userId = session?.user?.id;
  const organizationId = session?.user?.currentOrganizationId ?? null;

  if (!userId) {
    return {
      ok: false,
      message: "You must be signed in.",
    };
  }

  if (
    !input.enrollmentId ||
    !input.courseRecordId ||
    !input.lessonId ||
    !input.courseSlug
  ) {
    return {
      ok: false,
      message:
        "Enrollment, course record, lesson, and course slug are required.",
    };
  }

  const db = getDb();

  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  const [enrollment] = await db
    .select({
      id: enrollments.id,
      courseId: enrollments.courseId,
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.id, input.enrollmentId),
        eq(enrollments.userId, userId),
      ),
    )
    .limit(1);

  if (!enrollment) {
    return {
      ok: false,
      message: "Enrollment not found.",
    };
  }

  if (enrollment.courseId !== input.courseRecordId) {
    return {
      ok: false,
      message: "Enrollment does not belong to the specified course.",
    };
  }

  // Verify lessonId exists in the authoritative course structure.
  const [courseRow] = await db
    .select({ structure: courses.structure })
    .from(courses)
    .where(eq(courses.id, input.courseRecordId))
    .limit(1);

  if (!courseRow) {
    return {
      ok: false,
      message: "Course not found.",
    };
  }

  const structure = (courseRow.structure ?? {}) as SeededCourseStructure;
  const moduleList = Array.isArray(structure.modules) ? structure.modules : [];
  const lessonExists = moduleList.some(
    (m) =>
      Array.isArray(m.lessons) &&
      m.lessons.some((l: { id: string }) => l.id === input.lessonId),
  );

  if (!lessonExists) {
    return {
      ok: false,
      message: "Lesson not found in course structure.",
    };
  }

  try {
    const insertedProgress = await db
      .insert(lessonProgress)
      .values({
        enrollmentId: input.enrollmentId,
        lessonId: input.lessonId,
      })
      .onConflictDoNothing()
      .returning({ id: lessonProgress.id });

    if (insertedProgress.length > 0) {
      await enqueueRunnerWebhookEvent({
        eventType: "lesson.completed",
        organizationId,
        data: {
          lessonProgressId: insertedProgress[0].id,
          enrollmentId: input.enrollmentId,
          courseId: input.courseRecordId,
          lessonId: input.lessonId,
          userId,
        },
      });
    }

    revalidatePath(`/user/learn/${input.courseSlug}`);

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to complete lesson progress:", error);

    return {
      ok: false,
      message: "Unable to update lesson progress right now.",
    };
  }
}

// ---------------------------------------------------------------------------
// Evaluation attempts
// ---------------------------------------------------------------------------

type SubmitEvaluationAttemptInput = {
  enrollmentId: string;
  courseRecordId: string;
  courseSlug: string;
  scope: "MODULE" | "COURSE";
  /** Storyboard module ID (text). Required when scope = MODULE. */
  moduleId?: string;
  /** questionId → chosen optionId */
  answers: Record<string, string>;
};

type SubmitEvaluationAttemptResult =
  | {
      ok: true;
      passed: boolean;
      score: number;
      attemptId: string;
    }
  | {
      ok: false;
      message: string;
    };

async function enqueueRunnerWebhookEvent(input: {
  eventType:
    | "lesson.completed"
    | "evaluation.submitted"
    | "evaluation.passed"
    | "evaluation.failed"
    | "course.completed";
  organizationId?: string | null;
  data: Record<string, unknown>;
}) {
  const enqueueResult = await enqueueWebhookEvent({
    eventType: input.eventType,
    organizationId: input.organizationId ?? null,
    data: input.data,
  });

  if (!enqueueResult.ok) {
    console.error(`Failed to enqueue ${input.eventType} webhook event:`, {
      message: enqueueResult.message,
    });
  }
}

export async function submitEvaluationAttempt(
  input: SubmitEvaluationAttemptInput,
): Promise<SubmitEvaluationAttemptResult> {
  const session = await getSessionSafely();
  const userId = session?.user?.id;
  const organizationId = session?.user?.currentOrganizationId ?? null;

  if (!userId) {
    return { ok: false, message: "You must be signed in." };
  }

  if (!input.enrollmentId || !input.courseRecordId || !input.courseSlug) {
    return {
      ok: false,
      message: "Enrollment, course record, and course slug are required.",
    };
  }

  if (input.scope === "MODULE" && !input.moduleId) {
    return {
      ok: false,
      message: "Module ID is required for a module evaluation.",
    };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, message: "Database is not configured." };
  }

  // Verify the enrollment belongs to the current user and to the intended course.
  const [enrollment] = await db
    .select({
      id: enrollments.id,
      courseId: enrollments.courseId,
      completedAt: enrollments.completedAt,
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.id, input.enrollmentId),
        eq(enrollments.userId, userId),
      ),
    )
    .limit(1);

  if (!enrollment) {
    return { ok: false, message: "Enrollment not found." };
  }

  if (enrollment.courseId !== input.courseRecordId) {
    return {
      ok: false,
      message: "Enrollment does not belong to the specified course.",
    };
  }

  // Load authoritative evaluation definition from the course structure.
  const [courseRow] = await db
    .select({ structure: courses.structure })
    .from(courses)
    .where(eq(courses.id, input.courseRecordId))
    .limit(1);

  if (!courseRow) {
    return { ok: false, message: "Course not found." };
  }

  const structure = (courseRow.structure ?? {}) as SeededCourseStructure;
  const moduleList = Array.isArray(structure.modules) ? structure.modules : [];

  let evalTitle = "";
  let passingScore = 70;
  let questions: Array<{ id: string; correctOptionId: string }> = [];

  if (input.scope === "MODULE") {
    const targetModule = moduleList.find((m) => m.id === input.moduleId);
    const evalDef = targetModule?.evaluation;

    if (!evalDef) {
      return {
        ok: false,
        message: "Module evaluation not found in course structure.",
      };
    }

    evalTitle = evalDef.title;
    passingScore = evalDef.passingScore;
    questions = evalDef.questions.map(
      (q: { id: string; correctOptionId: string }) => ({
        id: q.id,
        correctOptionId: q.correctOptionId,
      }),
    );
  } else {
    const evalDef = structure.courseEvaluation;

    if (!evalDef) {
      return {
        ok: false,
        message: "Course evaluation not found in course structure.",
      };
    }

    evalTitle = evalDef.title;
    passingScore = evalDef.passingScore;
    questions = evalDef.questions.map(
      (q: { id: string; correctOptionId: string }) => ({
        id: q.id,
        correctOptionId: q.correctOptionId,
      }),
    );
  }

  if (questions.length === 0) {
    return { ok: false, message: "Evaluation has no questions." };
  }

  // Score answers against the authoritative correct options.
  const correctCount = questions.filter(
    (q) => input.answers[q.id] === q.correctOptionId,
  ).length;
  const scorePercent = (correctCount / questions.length) * 100;
  const passed = scorePercent >= passingScore;

  // Find or create the evaluations row (keyed by courseId + scope + moduleId).
  const scopeConditions = [
    eq(evaluations.courseId, input.courseRecordId),
    eq(evaluations.scope, input.scope),
    input.scope === "MODULE" && input.moduleId
      ? eq(evaluations.moduleId, input.moduleId)
      : isNull(evaluations.moduleId),
  ] as const;

  let evaluationId: string;

  const [existingEval] = await db
    .select({ id: evaluations.id })
    .from(evaluations)
    .where(and(...scopeConditions))
    .limit(1);

  if (existingEval) {
    evaluationId = existingEval.id;
  } else {
    const [created] = await db
      .insert(evaluations)
      .values({
        courseId: input.courseRecordId,
        title: evalTitle,
        scope: input.scope,
        definition: { questions },
        passingScore,
        moduleId: input.moduleId ?? null,
      })
      .returning({ id: evaluations.id });

    if (!created) {
      return { ok: false, message: "Could not create evaluation record." };
    }

    evaluationId = created.id;
  }

  try {
    const now = new Date();

    // Write the attempt record.
    const [attempt] = await db
      .insert(evaluationAttempts)
      .values({
        enrollmentId: input.enrollmentId,
        evaluationId,
        answers: input.answers,
        score: scorePercent,
        passed,
        submittedAt: now,
        gradedAt: now,
      })
      .returning({ id: evaluationAttempts.id });

    if (!attempt) {
      return { ok: false, message: "Could not save evaluation attempt." };
    }

    // Write the grade record.
    await db.insert(grades).values({
      enrollmentId: input.enrollmentId,
      evaluationId,
      attemptId: attempt.id,
      score: scorePercent,
    });

    await enqueueRunnerWebhookEvent({
      eventType: "evaluation.submitted",
      organizationId,
      data: {
        attemptId: attempt.id,
        enrollmentId: input.enrollmentId,
        evaluationId,
        courseId: input.courseRecordId,
        scope: input.scope,
        moduleId: input.moduleId ?? null,
        score: scorePercent,
        passed,
        userId,
      },
    });

    await enqueueRunnerWebhookEvent({
      eventType: passed ? "evaluation.passed" : "evaluation.failed",
      organizationId,
      data: {
        attemptId: attempt.id,
        enrollmentId: input.enrollmentId,
        evaluationId,
        courseId: input.courseRecordId,
        scope: input.scope,
        moduleId: input.moduleId ?? null,
        score: scorePercent,
        userId,
      },
    });

    // Stamp course completion when a course-scoped evaluation is passed.
    if (input.scope === "COURSE" && passed) {
      const completedEnrollments = await db
        .update(enrollments)
        .set({ completedAt: sql`now()` })
        .where(
          and(
            eq(enrollments.id, input.enrollmentId),
            isNull(enrollments.completedAt),
          ),
        )
        .returning({ id: enrollments.id });

      if (completedEnrollments.length > 0 && enrollment.completedAt === null) {
        await enqueueRunnerWebhookEvent({
          eventType: "course.completed",
          organizationId,
          data: {
            enrollmentId: input.enrollmentId,
            courseId: input.courseRecordId,
            userId,
            score: scorePercent,
          },
        });
      }
    }

    revalidatePath(`/user/learn/${input.courseSlug}`);

    return {
      ok: true,
      passed,
      score: scorePercent,
      attemptId: attempt.id,
    };
  } catch (error) {
    console.error("Failed to submit evaluation attempt:", error);
    return { ok: false, message: "Unable to submit evaluation right now." };
  }
}
