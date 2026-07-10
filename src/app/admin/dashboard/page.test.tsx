// @vitest-environment jsdom

import {
  renderServerComponent,
  setupAfterEach,
} from "@/test-utils/async-server-component";
import { screen } from "@testing-library/react";
import { describe, expect, it, type Mock, vi } from "vitest";

vi.mock("next/link", async () => {
  const { nextLinkFactory } =
    await import("@/test-utils/async-server-component");
  return nextLinkFactory();
});
vi.mock("next/navigation", async () => {
  const { nextNavigationFactory } =
    await import("@/test-utils/async-server-component");
  return nextNavigationFactory();
});

vi.mock("@/auth/session", () => ({
  getSessionSafely: vi.fn(),
}));

vi.mock("@/auth/dashboard", () => ({
  getDashboardPathForRole: vi.fn(() => "/admin/dashboard"),
}));

vi.mock("@/app/actions/courses", () => ({
  fetchSeededCourses: vi.fn(),
}));

vi.mock("@/components/admin/new-course/New-course-button", () => ({
  default: () => <button>New Course</button>,
}));

vi.mock("@/components/course-summary-card/Course-summary-card", () => ({
  default: ({ course }: { course: { title: string } }) => (
    <div data-testid="course-card">{course.title}</div>
  ),
}));

setupAfterEach();

const adminSession = {
  user: { id: "user-1", email: "admin@example.com", role: "ADMIN" },
};

async function renderPage(searchParams?: Record<string, string>) {
  const { getSessionSafely } = await import("@/auth/session");
  (getSessionSafely as Mock).mockResolvedValueOnce(adminSession);

  const { default: Page } = await import("./page");
  return renderServerComponent(Page({ searchParams }));
}

describe("Admin Dashboard Page", () => {
  it("renders the filter form when the user is authenticated", async () => {
    const { fetchSeededCourses } = await import("@/app/actions/courses");
    (fetchSeededCourses as Mock).mockResolvedValueOnce([]);

    await renderPage();

    expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Search courses by title")).toBeTruthy();
  });

  it("renders the empty state when there are no courses", async () => {
    const { fetchSeededCourses } = await import("@/app/actions/courses");
    (fetchSeededCourses as Mock).mockResolvedValueOnce([]);

    await renderPage();

    expect(screen.getByText("No matching courses")).toBeTruthy();
  });

  it("renders a course card for each returned course", async () => {
    const { fetchSeededCourses } = await import("@/app/actions/courses");
    (fetchSeededCourses as Mock).mockResolvedValueOnce([
      {
        id: "c1",
        title: "Intro to TypeScript",
        slug: "intro-ts",
        description: "Learn TypeScript",
        status: "PUBLISHED",
        version: 1,
        createdById: "user-1",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        structure: null,
      },
    ]);

    await renderPage();

    expect(screen.getByText("Intro to TypeScript")).toBeTruthy();
    expect(screen.queryByText("No matching courses")).toBeNull();
  });

  it("renders the empty state when fetchSeededCourses returns undefined", async () => {
    const { fetchSeededCourses } = await import("@/app/actions/courses");
    (fetchSeededCourses as Mock).mockResolvedValueOnce(undefined);

    await renderPage();

    expect(screen.getByText("No matching courses")).toBeTruthy();
  });
});
