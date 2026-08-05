// @vitest-environment jsdom

import {
  renderServerComponent,
  setupAfterEach,
} from "@/test-utils/async-server-component";
import {
  createSelectChainMock,
  fromOrderByResolved,
  fromWhereOrderByResolved,
  fromWhereResolved,
} from "@/test-utils/drizzle-chain-mocks";
import { screen } from "@testing-library/react";
import { describe, expect, it, type Mock, vi } from "vitest";

const redirectMock = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("@/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/auth/session", () => ({
  getSessionSafely: vi.fn(),
}));

vi.mock("@/auth/dashboard", () => ({
  getDashboardPathForRole: vi.fn(() => "/admin/dashboard"),
}));

vi.mock("@/app/actions/courses", () => ({
  fetchSeededCourses: vi.fn(),
}));

vi.mock("@/components/admin/enrollments/Enrollment-manager", () => ({
  default: ({
    courses,
    students,
    selectedCourseId,
    enrolledStudentIds,
  }: {
    courses: Array<{ id: string; title: string }>;
    students: Array<{ id: string; name: string }>;
    selectedCourseId: string | null;
    enrolledStudentIds: string[];
  }) => (
    <section>
      <p data-testid="selected-course-id">{selectedCourseId ?? "none"}</p>
      <p data-testid="course-count">{courses.length}</p>
      <p data-testid="student-count">{students.length}</p>
      <p data-testid="enrolled-count">{enrolledStudentIds.length}</p>
      {courses.map((course) => (
        <p key={course.id}>{course.title}</p>
      ))}
      {students.map((student) => (
        <p key={student.id}>{student.name}</p>
      ))}
    </section>
  ),
}));

setupAfterEach();

const adminSession = {
  user: { email: "admin@example.com", role: "ADMIN" },
};

async function renderPage(searchParams?: Record<string, string>) {
  const { default: EnrollmentsPage } = await import("./page");
  return renderServerComponent(EnrollmentsPage({ searchParams }));
}

describe("EnrollmentsPage", () => {
  it("should redirect to /auth/signin if no session is provided", async () => {
    const { getSessionSafely } = await import("@/auth/session");
    (getSessionSafely as Mock).mockResolvedValueOnce(null);

    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/auth/signin");
  });

  it("should redirect to dashboard path if user role is not ADMIN", async () => {
    const { getSessionSafely } = await import("@/auth/session");
    const { getDashboardPathForRole } = await import("@/auth/dashboard");

    (getSessionSafely as Mock).mockResolvedValueOnce({
      user: { email: "test@example.com", role: "STUDENT" },
    });
    (getDashboardPathForRole as Mock).mockReturnValue("/dashboard");

    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("should display database error message if db is not configured", async () => {
    const { getSessionSafely } = await import("@/auth/session");
    const { getDashboardPathForRole } = await import("@/auth/dashboard");
    (getSessionSafely as Mock).mockResolvedValueOnce(adminSession);
    (getDashboardPathForRole as Mock).mockReturnValueOnce("/admin/dashboard");

    const { getDb } = await import("@/db");
    (getDb as Mock).mockReturnValue(null);

    await renderPage();

    expect(
      screen.getByText(
        "Database is not configured. Set DATABASE_URL and retry.",
      ),
    ).toBeTruthy();
  });

  it("should fetch and pass course and student data to enrollment manager", async () => {
    const { getSessionSafely } = await import("@/auth/session");
    const { getDashboardPathForRole } = await import("@/auth/dashboard");
    (getSessionSafely as Mock).mockResolvedValueOnce(adminSession);
    (getDashboardPathForRole as Mock).mockReturnValueOnce("/admin/dashboard");

    const mockCourseRows = [
      {
        id: "course-1",
        title: "Math",
        slug: "math",
        status: "PUBLISHED" as const,
      },
      {
        id: "course-2",
        title: "Science",
        slug: "science",
        status: "DRAFT" as const,
      },
    ];
    const mockStudentRows = [
      { id: "student-1", name: "John Doe", email: "john@example.com" },
      { id: "student-2", name: "Jane Smith", email: "jane@example.com" },
    ];

    const { getDb } = await import("@/db");
    (getDb as Mock).mockReturnValue(
      createSelectChainMock([
        fromOrderByResolved(mockCourseRows),
        fromWhereOrderByResolved(mockStudentRows),
        fromWhereResolved([{ userId: "student-1" }]),
      ]),
    );

    await renderPage();

    expect(screen.getByText("Math")).toBeTruthy();
    expect(screen.getByText("Science")).toBeTruthy();
    expect(screen.getByText("John Doe")).toBeTruthy();
    expect(screen.getByText("Jane Smith")).toBeTruthy();
    expect(screen.getByTestId("selected-course-id").textContent).toBe(
      "course-1",
    );
    expect(screen.getByTestId("enrolled-count").textContent).toBe("1");
  });

  it("should honor the selected course from search params", async () => {
    const { getSessionSafely } = await import("@/auth/session");
    const { getDashboardPathForRole } = await import("@/auth/dashboard");
    (getSessionSafely as Mock).mockResolvedValueOnce(adminSession);
    (getDashboardPathForRole as Mock).mockReturnValueOnce("/admin/dashboard");

    const mockCourseRows = [
      {
        id: "course-1",
        title: "Math",
        slug: "math",
        status: "PUBLISHED" as const,
      },
      {
        id: "course-2",
        title: "Science",
        slug: "science",
        status: "DRAFT" as const,
      },
    ];
    const mockStudentRows = [
      { id: "student-1", name: "John Doe", email: "john@example.com" },
    ];

    const { getDb } = await import("@/db");
    (getDb as Mock).mockReturnValue(
      createSelectChainMock([
        fromOrderByResolved(mockCourseRows),
        fromWhereOrderByResolved(mockStudentRows),
        fromWhereResolved([{ userId: "student-1" }]),
      ]),
    );

    await renderPage({ courseId: "course-2" });

    expect(screen.getByTestId("selected-course-id").textContent).toBe(
      "course-2",
    );
  });
});
