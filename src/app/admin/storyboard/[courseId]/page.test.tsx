// @vitest-environment jsdom

// This file will check for basic rendering of the page and that the correct components are present. It will not check for the correctness of the data being displayed, as that is covered in other tests.
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
  fetchCourseBySlug: vi.fn(),
}));

vi.mock("@/components/storyboard/workspace/Workspace", () => ({
  default: ({
    initialCourse,
    courseRecordId,
    readOnly,
  }: {
    initialCourse: { title: string; slug?: string };
    courseRecordId: string;
    readOnly?: boolean;
  }) => (
    <section>
      <h2>Storyboard Workspace</h2>
      <p>{initialCourse.title}</p>
      <p>{courseRecordId}</p>
      <p>{readOnly ? "read-only" : "editable"}</p>
      <p>{initialCourse.slug}</p>
    </section>
  ),
}));

setupAfterEach();

async function renderPage() {
  const { getSessionSafely } = await import("@/auth/session");
  (getSessionSafely as Mock).mockResolvedValueOnce({
    user: {
      id: "test-user-id",
      email: "test@example.com",
      role: "admin",
    },
  });

  const { fetchCourseBySlug } = await import("@/app/actions/courses");
  (fetchCourseBySlug as Mock).mockResolvedValueOnce({
    id: "course-1",
    title: "Test Course",
    slug: "test-course",
    description: "A test course",
    createdById: "test-user-id",
    version: 1,
    status: "DRAFT",
    structure: null,
  });

  const { default: StoryboardPage } = await import("./page");

  return renderServerComponent(
    StoryboardPage({ params: { courseId: "test-course-id" } }),
  );
}

describe("StoryboardPage", () => {
  it("renders the StoryboardPage component", async () => {
    await renderPage();

    const workspaceElement = screen.getByText(/Storyboard Workspace/i);
    expect(workspaceElement).toBeDefined();
  });

  it("renders the preview link for the course slug", async () => {
    await renderPage();

    const previewLink = screen.getByRole("link", {
      name: /preview in course runner/i,
    });
    expect(previewLink.getAttribute("href")).toBe("/admin/preview/test-course");
    expect(screen.getByText("test-course")).toBeDefined();
  });

  it("marks the workspace as read-only when the current user is not the creator", async () => {
    const { getSessionSafely } = await import("@/auth/session");
    (getSessionSafely as Mock).mockResolvedValueOnce({
      user: {
        id: "viewer-user-id",
        email: "viewer@example.com",
        role: "admin",
      },
    });

    const { fetchCourseBySlug } = await import("@/app/actions/courses");
    (fetchCourseBySlug as Mock).mockResolvedValueOnce({
      id: "course-1",
      title: "Test Course",
      slug: "test-course",
      description: "A test course",
      createdById: "owner-user-id",
      version: 1,
      status: "DRAFT",
      structure: null,
    });

    const { default: StoryboardPage } = await import("./page");
    await renderServerComponent(
      StoryboardPage({ params: { courseId: "test-course-id" } }),
    );

    expect(screen.getByText("read-only")).toBeDefined();
  });

  it("redirects unauthenticated users to the sign-in page", async () => {
    const { getSessionSafely } = await import("@/auth/session");
    (getSessionSafely as Mock).mockResolvedValueOnce({
      user: { id: "test-user-id", email: null, role: "admin" },
    });

    const { redirect } = await import("next/navigation");
    (redirect as Mock).mockImplementation(() => {
      throw new Error("redirect");
    });

    const { default: StoryboardPage } = await import("./page");

    await expect(
      renderServerComponent(
        StoryboardPage({ params: { courseId: "test-course-id" } }),
      ),
    ).rejects.toThrow("redirect");
    expect(redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("redirects non-admin users to their dashboard", async () => {
    const { getSessionSafely } = await import("@/auth/session");
    (getSessionSafely as Mock).mockResolvedValueOnce({
      user: {
        id: "test-user-id",
        email: "student@example.com",
        role: "student",
      },
    });

    const { getDashboardPathForRole } = await import("@/auth/dashboard");
    (getDashboardPathForRole as Mock).mockReturnValueOnce("/student/dashboard");

    const { redirect } = await import("next/navigation");
    (redirect as Mock).mockImplementation(() => {
      throw new Error("redirect");
    });

    const { default: StoryboardPage } = await import("./page");

    await expect(
      renderServerComponent(
        StoryboardPage({ params: { courseId: "test-course-id" } }),
      ),
    ).rejects.toThrow("redirect");
    expect(redirect).toHaveBeenCalledWith("/student/dashboard");
  });
});
