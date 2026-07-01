import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth/session", () => ({
  getSessionSafely: vi.fn(),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/schema", () => ({
  courses: {
    id: "courses.id",
    structure: "courses.structure",
  },
  enrollments: {
    id: "enrollments.id",
    courseId: "enrollments.courseId",
    userId: "enrollments.userId",
    completedAt: "enrollments.completedAt",
  },
  lessonProgress: {
    enrollmentId: "lessonProgress.enrollmentId",
    lessonId: "lessonProgress.lessonId",
  },
  evaluations: {
    id: "evaluations.id",
    courseId: "evaluations.courseId",
    scope: "evaluations.scope",
    moduleId: "evaluations.moduleId",
  },
  evaluationAttempts: {
    id: "evaluationAttempts.id",
  },
  grades: {
    id: "grades.id",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({
    op: "and",
    conditions,
  })),
  eq: vi.fn((left: unknown, right: unknown) => ({
    op: "eq",
    left,
    right,
  })),
  isNull: vi.fn((value: unknown) => ({
    op: "isNull",
    value,
  })),
  sql: vi.fn((strings: TemplateStringsArray, ...expressions: unknown[]) => ({
    op: "sql",
    strings,
    expressions,
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  completeLessonProgress,
  submitEvaluationAttempt,
} from "./course-runner";

const mockedGetSessionSafely = vi.mocked(getSessionSafely);
const mockedGetDb = vi.mocked(getDb);
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedEq = vi.mocked(eq);
const mockedIsNull = vi.mocked(isNull);

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetSessionSafely.mockResolvedValue({
    user: {
      id: "student-1",
      role: "STUDENT",
    },
  });
});

describe("completeLessonProgress", () => {
  it("rejects unauthenticated users", async () => {
    mockedGetSessionSafely.mockResolvedValue(null);

    const result = await completeLessonProgress({
      enrollmentId: "enroll-1",
      courseRecordId: "course-1",
      lessonId: "lesson-1",
      courseSlug: "intro-to-ts",
    });

    expect(result).toEqual({
      ok: false,
      message: "You must be signed in.",
    });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("returns an error when enrollment does not belong to the course", async () => {
    const limitEnrollment = vi.fn(async () => [
      { id: "enroll-1", courseId: "course-2" },
    ]);
    const whereEnrollment = vi.fn(() => ({ limit: limitEnrollment }));
    const fromEnrollment = vi.fn(() => ({ where: whereEnrollment }));

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: fromEnrollment })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(async () => [{ structure: { modules: [] } }]),
          })),
        })),
      });

    mockedGetDb.mockReturnValue({
      select,
    } as unknown as ReturnType<typeof getDb>);

    const result = await completeLessonProgress({
      enrollmentId: "enroll-1",
      courseRecordId: "course-1",
      lessonId: "lesson-1",
      courseSlug: "intro-to-ts",
    });

    expect(result).toEqual({
      ok: false,
      message: "Enrollment does not belong to the specified course.",
    });
  });

  it("inserts lesson progress and revalidates on success", async () => {
    const limitEnrollment = vi.fn(async () => [
      { id: "enroll-1", courseId: "course-1" },
    ]);
    const whereEnrollment = vi.fn(() => ({ limit: limitEnrollment }));
    const fromEnrollment = vi.fn(() => ({ where: whereEnrollment }));

    const limitCourse = vi.fn(async () => [
      {
        structure: {
          modules: [
            {
              id: "module-1",
              lessons: [{ id: "lesson-1" }],
            },
          ],
        },
      },
    ]);
    const whereCourse = vi.fn(() => ({ limit: limitCourse }));
    const fromCourse = vi.fn(() => ({ where: whereCourse }));

    const onConflictDoNothing = vi.fn(async () => undefined);
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const insert = vi.fn(() => ({ values }));

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: fromEnrollment })
      .mockReturnValueOnce({ from: fromCourse });

    mockedGetDb.mockReturnValue({
      select,
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const result = await completeLessonProgress({
      enrollmentId: "enroll-1",
      courseRecordId: "course-1",
      lessonId: "lesson-1",
      courseSlug: "intro-to-ts",
    });

    expect(result).toEqual({ ok: true });
    expect(values).toHaveBeenCalledWith({
      enrollmentId: "enroll-1",
      lessonId: "lesson-1",
    });
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/user/learn/intro-to-ts",
    );
  });

  it("returns an error when lesson does not exist in structure", async () => {
    const limitEnrollment = vi.fn(async () => [
      { id: "enroll-1", courseId: "course-1" },
    ]);
    const whereEnrollment = vi.fn(() => ({ limit: limitEnrollment }));
    const fromEnrollment = vi.fn(() => ({ where: whereEnrollment }));

    const limitCourse = vi.fn(async () => [
      {
        structure: {
          modules: [{ id: "module-1", lessons: [{ id: "other-lesson" }] }],
        },
      },
    ]);
    const whereCourse = vi.fn(() => ({ limit: limitCourse }));
    const fromCourse = vi.fn(() => ({ where: whereCourse }));

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: fromEnrollment })
      .mockReturnValueOnce({ from: fromCourse });

    mockedGetDb.mockReturnValue({
      select,
    } as unknown as ReturnType<typeof getDb>);

    const result = await completeLessonProgress({
      enrollmentId: "enroll-1",
      courseRecordId: "course-1",
      lessonId: "lesson-1",
      courseSlug: "intro-to-ts",
    });

    expect(result).toEqual({
      ok: false,
      message: "Lesson not found in course structure.",
    });
  });
});

describe("submitEvaluationAttempt", () => {
  it("requires moduleId for module evaluations", async () => {
    const result = await submitEvaluationAttempt({
      enrollmentId: "enroll-1",
      courseRecordId: "course-1",
      courseSlug: "intro-to-ts",
      scope: "MODULE",
      answers: {},
    });

    expect(result).toEqual({
      ok: false,
      message: "Module ID is required for a module evaluation.",
    });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("returns error when course evaluation is missing", async () => {
    const limitEnrollment = vi.fn(async () => [
      { id: "enroll-1", courseId: "course-1" },
    ]);
    const whereEnrollment = vi.fn(() => ({ limit: limitEnrollment }));
    const fromEnrollment = vi.fn(() => ({ where: whereEnrollment }));

    const limitCourse = vi.fn(async () => [{ structure: { modules: [] } }]);
    const whereCourse = vi.fn(() => ({ limit: limitCourse }));
    const fromCourse = vi.fn(() => ({ where: whereCourse }));

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: fromEnrollment })
      .mockReturnValueOnce({ from: fromCourse });

    mockedGetDb.mockReturnValue({
      select,
    } as unknown as ReturnType<typeof getDb>);

    const result = await submitEvaluationAttempt({
      enrollmentId: "enroll-1",
      courseRecordId: "course-1",
      courseSlug: "intro-to-ts",
      scope: "COURSE",
      answers: { q1: "a1" },
    });

    expect(result).toEqual({
      ok: false,
      message: "Course evaluation not found in course structure.",
    });
  });

  it("creates attempt and grade for an existing module evaluation", async () => {
    const limitEnrollment = vi.fn(async () => [
      { id: "enroll-1", courseId: "course-1" },
    ]);
    const whereEnrollment = vi.fn(() => ({ limit: limitEnrollment }));
    const fromEnrollment = vi.fn(() => ({ where: whereEnrollment }));

    const limitCourse = vi.fn(async () => [
      {
        structure: {
          modules: [
            {
              id: "module-1",
              evaluation: {
                title: "Module Quiz",
                passingScore: 70,
                questions: [
                  { id: "q1", correctOptionId: "a1" },
                  { id: "q2", correctOptionId: "a2" },
                ],
              },
            },
          ],
        },
      },
    ]);
    const whereCourse = vi.fn(() => ({ limit: limitCourse }));
    const fromCourse = vi.fn(() => ({ where: whereCourse }));

    const limitEvaluation = vi.fn(async () => [{ id: "eval-1" }]);
    const whereEvaluation = vi.fn(() => ({ limit: limitEvaluation }));
    const fromEvaluation = vi.fn(() => ({ where: whereEvaluation }));

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: fromEnrollment })
      .mockReturnValueOnce({ from: fromCourse })
      .mockReturnValueOnce({ from: fromEvaluation });

    const returningAttempt = vi.fn(async () => [{ id: "attempt-1" }]);
    const valuesAttempts = vi.fn(() => ({ returning: returningAttempt }));

    const valuesGrades = vi.fn(async () => undefined);

    const insert = vi
      .fn()
      .mockReturnValueOnce({ values: valuesAttempts })
      .mockReturnValueOnce({ values: valuesGrades });

    mockedGetDb.mockReturnValue({
      select,
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const result = await submitEvaluationAttempt({
      enrollmentId: "enroll-1",
      courseRecordId: "course-1",
      courseSlug: "intro-to-ts",
      scope: "MODULE",
      moduleId: "module-1",
      answers: {
        q1: "a1",
        q2: "a2",
      },
    });

    expect(result).toEqual({
      ok: true,
      passed: true,
      score: 100,
      attemptId: "attempt-1",
    });
    expect(mockedEq).toHaveBeenCalledWith("evaluations.moduleId", "module-1");
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/user/learn/intro-to-ts",
    );
  });

  it("creates evaluation when missing and marks enrollment complete on passed course eval", async () => {
    const limitEnrollment = vi.fn(async () => [
      { id: "enroll-1", courseId: "course-1" },
    ]);
    const whereEnrollment = vi.fn(() => ({ limit: limitEnrollment }));
    const fromEnrollment = vi.fn(() => ({ where: whereEnrollment }));

    const limitCourse = vi.fn(async () => [
      {
        structure: {
          courseEvaluation: {
            title: "Final Evaluation",
            passingScore: 60,
            questions: [
              { id: "q1", correctOptionId: "a1" },
              { id: "q2", correctOptionId: "a2" },
            ],
          },
          modules: [],
        },
      },
    ]);
    const whereCourse = vi.fn(() => ({ limit: limitCourse }));
    const fromCourse = vi.fn(() => ({ where: whereCourse }));

    const limitEvaluation = vi.fn(async () => []);
    const whereEvaluation = vi.fn(() => ({ limit: limitEvaluation }));
    const fromEvaluation = vi.fn(() => ({ where: whereEvaluation }));

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: fromEnrollment })
      .mockReturnValueOnce({ from: fromCourse })
      .mockReturnValueOnce({ from: fromEvaluation });

    const returningCreatedEval = vi.fn(async () => [{ id: "eval-created-1" }]);
    const valuesCreatedEval = vi.fn(() => ({
      returning: returningCreatedEval,
    }));

    const returningAttempt = vi.fn(async () => [{ id: "attempt-1" }]);
    const valuesAttempts = vi.fn(() => ({ returning: returningAttempt }));

    const valuesGrades = vi.fn(async () => undefined);

    const insert = vi
      .fn()
      .mockReturnValueOnce({ values: valuesCreatedEval })
      .mockReturnValueOnce({ values: valuesAttempts })
      .mockReturnValueOnce({ values: valuesGrades });

    const whereUpdate = vi.fn(async () => undefined);
    const setUpdate = vi.fn(() => ({ where: whereUpdate }));
    const update = vi.fn(() => ({ set: setUpdate }));

    mockedGetDb.mockReturnValue({
      select,
      insert,
      update,
    } as unknown as ReturnType<typeof getDb>);

    const result = await submitEvaluationAttempt({
      enrollmentId: "enroll-1",
      courseRecordId: "course-1",
      courseSlug: "intro-to-ts",
      scope: "COURSE",
      answers: {
        q1: "a1",
        q2: "a2",
      },
    });

    expect(result).toEqual({
      ok: true,
      passed: true,
      score: 100,
      attemptId: "attempt-1",
    });
    expect(mockedIsNull).toHaveBeenCalledWith("evaluations.moduleId");
    expect(setUpdate).toHaveBeenCalledWith({ completedAt: expect.anything() });
    expect(whereUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ op: "eq" }),
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith(
      "/user/learn/intro-to-ts",
    );
  });

  it("returns a friendly error when attempt insert fails", async () => {
    const limitEnrollment = vi.fn(async () => [
      { id: "enroll-1", courseId: "course-1" },
    ]);
    const whereEnrollment = vi.fn(() => ({ limit: limitEnrollment }));
    const fromEnrollment = vi.fn(() => ({ where: whereEnrollment }));

    const limitCourse = vi.fn(async () => [
      {
        structure: {
          courseEvaluation: {
            title: "Final Evaluation",
            passingScore: 60,
            questions: [{ id: "q1", correctOptionId: "a1" }],
          },
          modules: [],
        },
      },
    ]);
    const whereCourse = vi.fn(() => ({ limit: limitCourse }));
    const fromCourse = vi.fn(() => ({ where: whereCourse }));

    const limitEvaluation = vi.fn(async () => [{ id: "eval-1" }]);
    const whereEvaluation = vi.fn(() => ({ limit: limitEvaluation }));
    const fromEvaluation = vi.fn(() => ({ where: whereEvaluation }));

    const select = vi
      .fn()
      .mockReturnValueOnce({ from: fromEnrollment })
      .mockReturnValueOnce({ from: fromCourse })
      .mockReturnValueOnce({ from: fromEvaluation });

    const returningAttempt = vi.fn(async () => {
      throw new Error("insert failed");
    });
    const valuesAttempts = vi.fn(() => ({ returning: returningAttempt }));

    const insert = vi.fn().mockReturnValueOnce({ values: valuesAttempts });

    mockedGetDb.mockReturnValue({
      select,
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const result = await submitEvaluationAttempt({
      enrollmentId: "enroll-1",
      courseRecordId: "course-1",
      courseSlug: "intro-to-ts",
      scope: "COURSE",
      answers: {
        q1: "a1",
      },
    });

    expect(result).toEqual({
      ok: false,
      message: "Unable to submit evaluation right now.",
    });
  });
});
