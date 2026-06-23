import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  andMock,
  eqMock,
  generateQuizQuestionsMock,
  getDbMock,
  getRedisClientConnectedMock,
  getSessionSafelyMock,
  notFoundMock,
  revalidatePathMock,
  sqlMock,
} = vi.hoisted(() => ({
  andMock: vi.fn((...conditions: unknown[]) => ({
    op: "and",
    conditions,
  })),
  eqMock: vi.fn((left: unknown, right: unknown) => ({
    op: "eq",
    left,
    right,
  })),
  generateQuizQuestionsMock: vi.fn(),
  getDbMock: vi.fn(),
  getRedisClientConnectedMock: vi.fn(),
  getSessionSafelyMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  revalidatePathMock: vi.fn(),
  sqlMock: vi.fn(
    (strings: TemplateStringsArray, ...expressions: unknown[]) => ({
      strings,
      expressions,
    }),
  ),
}));

vi.mock("@/app/utils/claude-ai/claude-ai", () => ({
  generateQuizQuestions: generateQuizQuestionsMock,
}));

vi.mock("@/app/utils/redis/redis-client", () => ({
  getRedisClientConnected: getRedisClientConnectedMock,
}));

vi.mock("@/auth/session", () => ({
  getSessionSafely: getSessionSafelyMock,
}));

vi.mock("@/db", () => ({
  getDb: getDbMock,
}));

vi.mock("@/db/schema", () => ({
  courses: {
    id: "courses.id",
    slug: "courses.slug",
    description: "courses.description",
    status: "courses.status",
    version: "courses.version",
    createdById: "courses.createdById",
    createdAt: "courses.createdAt",
    updatedAt: "courses.updatedAt",
    title: "courses.title",
    structure: "courses.structure",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  eq: eqMock,
  sql: sqlMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import type { ApiCoursePayload } from "../utils/storyboard-builder/definitions";
import {
  createCourse,
  fetchCourseBySlug,
  fetchSeededCourses,
  generateCourseEvaluationQuiz,
  saveCourseStoryboard,
} from "./courses";

const mockedGetSessionSafely = vi.mocked(getSessionSafely);
const mockedGetDb = vi.mocked(getDb);
const mockedGenerateQuizQuestions = vi.mocked(generateQuizQuestionsMock);
const mockedGetRedisClientConnected = vi.mocked(getRedisClientConnectedMock);
const mockedRevalidatePath = vi.mocked(revalidatePath);
const mockedNotFound = vi.mocked(notFound);
const mockedAnd = vi.mocked(and);
const mockedEq = vi.mocked(eq);

function mockAdminSession() {
  mockedGetSessionSafely.mockResolvedValue({
    user: {
      id: "admin-1",
      role: "ADMIN",
    },
  });
}

function makeCoursePayload(): ApiCoursePayload {
  return {
    id: "course-1",
    title: "Original title",
    slug: "original-title",
    version: 2,
    status: "DRAFT",
    synopsis: "Original synopsis",
    audience: "Beginners",
    estimatedDuration: "2 hours",
    welcomeImages: [{ id: "image-1", url: "https://example.com/welcome.png" }],
    modules: [
      {
        id: "module-1",
        title: "Module One",
        progressLabel: "50%",
        lessons: [
          {
            id: "lesson-1",
            title: "Lesson One",
            duration: "10m",
            objective: "Learn the basics",
            blocks: [
              {
                id: "block-1",
                type: "richtext",
                title: "Block One",
                detail: "<p>Important <strong>ideas</strong></p>",
                duration: "5m",
              },
            ],
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAdminSession();
});

describe("fetchSeededCourses", () => {
  it("returns the selected course rows", async () => {
    const rows = [{ id: "course-1", title: "Course 1" }];
    const from = vi.fn(async () => rows);
    const select = vi.fn(() => ({ from }));

    mockedGetDb.mockReturnValue({
      select,
    } as unknown as ReturnType<typeof getDb>);

    const result = await fetchSeededCourses();

    expect(result).toBe(rows);
    expect(select).toHaveBeenCalledWith({
      id: "courses.id",
      slug: "courses.slug",
      description: "courses.description",
      status: "courses.status",
      version: "courses.version",
      createdById: "courses.createdById",
      createdAt: expect.anything(),
      updatedAt: expect.anything(),
      title: "courses.title",
      structure: "courses.structure",
    });
    expect(from).toHaveBeenCalledWith(
      expect.objectContaining({ id: "courses.id" }),
    );
  });
});

describe("fetchCourseBySlug", () => {
  it("returns the first matching course", async () => {
    const rows = [{ id: "course-1", slug: "intro-to-ts" }];
    const where = vi.fn(async () => rows);
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));

    mockedGetDb.mockReturnValue({
      select,
    } as unknown as ReturnType<typeof getDb>);

    const result = await fetchCourseBySlug("intro-to-ts");

    expect(result).toBe(rows[0]);
    expect(mockedEq).toHaveBeenCalledWith("courses.slug", "intro-to-ts");
    expect(where).toHaveBeenCalledWith(expect.objectContaining({ op: "eq" }));
  });
});

describe("createCourse", () => {
  it("rejects non-admin users", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: {
        id: "student-1",
        role: "STUDENT",
      },
    });

    const result = await createCourse({
      title: "New course",
      description: "Course description",
    });

    expect(result).toEqual({
      ok: false,
      message: "You are not authorized to create courses.",
    });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("creates a course with trimmed fields and initial structure", async () => {
    const returning = vi.fn(async () => [
      {
        id: "course-123",
        slug: "new-course-abc123",
      },
    ]);
    const values = vi.fn(() => ({ returning }));
    const insert = vi.fn(() => ({ values }));

    mockedGetDb.mockReturnValue({
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const result = await createCourse({
      title: "  New Course  ",
      description: "  Course description  ",
    });

    expect(result).toEqual({
      ok: true,
      id: "course-123",
      slug: "new-course-abc123",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New Course",
        description: "Course description",
        status: "DRAFT",
        createdById: "admin-1",
        structure: expect.objectContaining({
          courseId: "",
          metadata: {
            synopsis: "Course description",
            audience: "",
            estimatedDuration: "",
            welcomeImages: [],
          },
          modules: [
            expect.objectContaining({
              title: "New Module",
              progressLabel: "0%",
              lessons: [
                expect.objectContaining({
                  title: "New Lesson",
                  duration: "",
                  objective: "",
                  blocks: [],
                }),
              ],
            }),
          ],
        }),
      }),
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/dashboard");
  });
});

describe("saveCourseStoryboard", () => {
  it("returns a version conflict when the stored version changed", async () => {
    const payload = makeCoursePayload();
    const ownerRows = [{ createdById: "admin-1" }];
    const updatedRows: [] = [];
    const ownerLimit = vi.fn(async () => ownerRows);
    const ownerWhere = vi.fn(() => ({ limit: ownerLimit }));
    const select = vi.fn(() => ({
      from: vi.fn(() => ({ where: ownerWhere })),
    }));
    const returning = vi.fn(async () => updatedRows);
    const updateWhere = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where: updateWhere }));
    const update = vi.fn(() => ({ set }));

    mockedGetDb.mockReturnValue({
      select,
      update,
    } as unknown as ReturnType<typeof getDb>);

    const result = await saveCourseStoryboard({
      courseId: "course-1",
      expectedVersion: 2,
      payload,
    });

    expect(result).toEqual({
      ok: false,
      code: "VERSION_CONFLICT",
      message:
        "This storyboard changed elsewhere. Refresh to get the latest version.",
    });
    expect(mockedEq).toHaveBeenCalledWith("courses.id", "course-1");
    expect(mockedEq).toHaveBeenCalledWith("courses.version", 2);
    expect(mockedAnd).toHaveBeenCalledTimes(1);
  });

  it("updates the course and returns the new version", async () => {
    const payload = makeCoursePayload();
    const ownerRows = [{ createdById: "admin-1" }];
    const updatedRows = [{ id: "course-1", version: 3 }];
    const ownerLimit = vi.fn(async () => ownerRows);
    const ownerWhere = vi.fn(() => ({ limit: ownerLimit }));
    const select = vi.fn(() => ({
      from: vi.fn(() => ({ where: ownerWhere })),
    }));
    const returning = vi.fn(async () => updatedRows);
    const updateWhere = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where: updateWhere }));
    const update = vi.fn(() => ({ set }));

    mockedGetDb.mockReturnValue({
      select,
      update,
    } as unknown as ReturnType<typeof getDb>);

    const result = await saveCourseStoryboard({
      courseId: "course-1",
      expectedVersion: 2,
      payload: {
        ...payload,
        title: "  Updated title  ",
      },
    });

    expect(result).toEqual({
      ok: true,
      version: 3,
      payload: expect.objectContaining({
        title: "Updated title",
        version: 3,
      }),
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Updated title",
        status: "DRAFT",
        description: "Original synopsis",
      }),
    );
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("generateCourseEvaluationQuiz", () => {
  it("returns a rate limit message when generation is throttled", async () => {
    const courseRows = [
      {
        title: "Quiz course",
        description: "Course description",
        createdById: "admin-1",
        structure: makeCoursePayload(),
      },
    ];
    const limit = vi.fn(async () => courseRows);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const ttl = vi.fn(async () => 12);
    const set = vi.fn(async () => null);
    const incr = vi.fn();
    const expire = vi.fn();

    mockedGetDb.mockReturnValue({
      select,
    } as unknown as ReturnType<typeof getDb>);
    mockedGetRedisClientConnected.mockResolvedValue({
      set,
      ttl,
      incr,
      expire,
    } as never);

    const result = await generateCourseEvaluationQuiz({
      courseId: "course-1",
      numberOfQuestions: 5,
    });

    expect(result).toEqual({
      ok: false,
      code: "RATE_LIMITED",
      message: "Please wait 12s before generating another quiz.",
    });
    expect(mockedGenerateQuizQuestions).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      "quiz-gen:cooldown:admin-1:course-1",
      "1",
      expect.objectContaining({ EX: 20, NX: true }),
    );
    expect(ttl).toHaveBeenCalledWith("quiz-gen:cooldown:admin-1:course-1");
  });

  it("generates a quiz from course content", async () => {
    const payload = makeCoursePayload();
    const courseRows = [
      {
        title: "Quiz course",
        description: "Course description",
        createdById: "admin-1",
        structure: payload,
      },
    ];
    const limit = vi.fn(async () => courseRows);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const ttl = vi.fn(async () => 20);
    const set = vi.fn(async () => "OK");
    const incr = vi.fn(async () => 1);
    const expire = vi.fn(async () => undefined);
    const quiz = {
      title: "Sample quiz",
      questions: [],
    };

    mockedGetDb.mockReturnValue({
      select,
    } as unknown as ReturnType<typeof getDb>);
    mockedGetRedisClientConnected.mockResolvedValue({
      set,
      ttl,
      incr,
      expire,
    } as never);
    mockedGenerateQuizQuestions.mockResolvedValue(quiz as never);

    const result = await generateCourseEvaluationQuiz({
      courseId: "course-1",
      numberOfQuestions: 7,
    });

    expect(result).toEqual({
      ok: true,
      quiz,
    });
    expect(mockedGenerateQuizQuestions).toHaveBeenCalledWith(
      expect.objectContaining({
        numberOfQuestions: 7,
        courseTitle: "Quiz course",
        courseContent: expect.stringContaining(
          "Module 1 Lesson 1 Block 1 detail: Important ideas",
        ),
      }),
    );
    expect(expire).toHaveBeenCalledWith(
      expect.stringMatching(/^quiz-gen:hour:admin-1:/),
      3600,
    );
  });
});
