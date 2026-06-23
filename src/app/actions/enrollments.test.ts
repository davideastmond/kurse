import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth/session", () => ({
  getSessionSafely: vi.fn(),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/schema", () => ({
  enrollments: {
    courseId: "enrollments.courseId",
    userId: "enrollments.userId",
  },
  users: {
    id: "users.id",
    role: "users.role",
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
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  enrollAllStudentsInCourse,
  enrollStudentInCourse,
  removeAllStudentsFromCourse,
  removeStudentFromCourse,
} from "./enrollments";

const mockedGetSessionSafely = vi.mocked(getSessionSafely);
const mockedGetDb = vi.mocked(getDb);
const mockedRevalidatePath = vi.mocked(revalidatePath);
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enrollStudentInCourse", () => {
  it("rejects non-admin users", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: {
        id: "student-1",
        role: "STUDENT",
      },
    });

    const result = await enrollStudentInCourse({
      courseId: "course-1",
      studentId: "student-1",
    });

    expect(result).toEqual({
      ok: false,
      message: "You are not authorized to manage enrollments.",
    });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("validates required course and student", async () => {
    mockAdminSession();

    const result = await enrollStudentInCourse({
      courseId: " ",
      studentId: "student-1",
    });

    expect(result).toEqual({
      ok: false,
      message: "Course and student are required.",
    });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("returns an error when database is not configured", async () => {
    mockAdminSession();
    mockedGetDb.mockReturnValue(null);

    const result = await enrollStudentInCourse({
      courseId: "course-1",
      studentId: "student-1",
    });

    expect(result).toEqual({
      ok: false,
      message: "Database is not configured.",
    });
  });

  it("inserts enrollment and revalidates admin page", async () => {
    mockAdminSession();

    const onConflictDoNothing = vi.fn(async () => undefined);
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const insert = vi.fn(() => ({ values }));

    mockedGetDb.mockReturnValue({
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const result = await enrollStudentInCourse({
      courseId: "course-1",
      studentId: "student-1",
    });

    expect(result).toEqual({ ok: true });
    expect(insert).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith({
      courseId: "course-1",
      userId: "student-1",
    });
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });

  it("returns a friendly error when enrollment insert fails", async () => {
    mockAdminSession();

    const onConflictDoNothing = vi.fn(async () => {
      throw new Error("insert failed");
    });
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const insert = vi.fn(() => ({ values }));

    mockedGetDb.mockReturnValue({
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const result = await enrollStudentInCourse({
      courseId: "course-1",
      studentId: "student-1",
    });

    expect(result).toEqual({
      ok: false,
      message: "Unable to enroll student right now.",
    });
    expect(mockedRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("removeStudentFromCourse", () => {
  it("deletes a single enrollment and revalidates", async () => {
    mockAdminSession();

    const where = vi.fn(async () => undefined);
    const del = vi.fn(() => ({ where }));

    mockedGetDb.mockReturnValue({
      delete: del,
    } as unknown as ReturnType<typeof getDb>);

    const result = await removeStudentFromCourse({
      courseId: "course-1",
      studentId: "student-1",
    });

    expect(result).toEqual({ ok: true });
    expect(mockedEq).toHaveBeenCalledWith("enrollments.courseId", "course-1");
    expect(mockedEq).toHaveBeenCalledWith("enrollments.userId", "student-1");
    expect(mockedAnd).toHaveBeenCalledTimes(1);
    expect(where).toHaveBeenCalledWith(
      expect.objectContaining({
        op: "and",
      }),
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });

  it("validates required course and student", async () => {
    mockAdminSession();

    const result = await removeStudentFromCourse({
      courseId: "course-1",
      studentId: " ",
    });

    expect(result).toEqual({
      ok: false,
      message: "Course and student are required.",
    });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });
});

describe("enrollAllStudentsInCourse", () => {
  it("validates required course", async () => {
    mockAdminSession();

    const result = await enrollAllStudentsInCourse({
      courseId: " ",
    });

    expect(result).toEqual({
      ok: false,
      message: "Course is required.",
    });
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("enrolls every student found for a course", async () => {
    mockAdminSession();

    const studentRows = [{ id: "student-1" }, { id: "student-2" }];
    const where = vi.fn(async () => studentRows);
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));

    const onConflictDoNothing = vi.fn(async () => undefined);
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const insert = vi.fn(() => ({ values }));

    mockedGetDb.mockReturnValue({
      select,
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const result = await enrollAllStudentsInCourse({
      courseId: "course-1",
    });

    expect(result).toEqual({ ok: true });
    expect(mockedEq).toHaveBeenCalledWith("users.role", "STUDENT");
    expect(values).toHaveBeenCalledWith([
      { courseId: "course-1", userId: "student-1" },
      { courseId: "course-1", userId: "student-2" },
    ]);
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });

  it("returns ok and only revalidates when there are no students", async () => {
    mockAdminSession();

    const where = vi.fn(async () => []);
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const insert = vi.fn();

    mockedGetDb.mockReturnValue({
      select,
      insert,
    } as unknown as ReturnType<typeof getDb>);

    const result = await enrollAllStudentsInCourse({
      courseId: "course-1",
    });

    expect(result).toEqual({ ok: true });
    expect(insert).not.toHaveBeenCalled();
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });
});

describe("removeAllStudentsFromCourse", () => {
  it("removes all enrollments for a course and revalidates", async () => {
    mockAdminSession();

    const where = vi.fn(async () => undefined);
    const del = vi.fn(() => ({ where }));

    mockedGetDb.mockReturnValue({
      delete: del,
    } as unknown as ReturnType<typeof getDb>);

    const result = await removeAllStudentsFromCourse({
      courseId: "course-1",
    });

    expect(result).toEqual({ ok: true });
    expect(mockedEq).toHaveBeenCalledWith("enrollments.courseId", "course-1");
    expect(where).toHaveBeenCalledWith(
      expect.objectContaining({
        op: "eq",
      }),
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin/enrollments");
  });
});
