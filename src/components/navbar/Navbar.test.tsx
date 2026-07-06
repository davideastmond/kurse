// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, Mock, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/auth/session", () => ({
  getSessionSafely: vi.fn(async () => null),
}));

vi.mock("@/auth/auth", () => ({
  signOut: vi.fn(async () => undefined),
}));

vi.mock("@/components/theme-toggle/Theme-toggle", () => ({
  default: () => <div data-testid="theme-toggle" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderNavbarWithSession(session: unknown) {
  const { getSessionSafely } = await import("@/auth/session");
  (getSessionSafely as Mock).mockResolvedValueOnce(session);

  const { default: Navbar } = await import("./Navbar");
  const resolvedServerComponent = await Navbar();
  render(resolvedServerComponent);
}

describe("Navbar", () => {
  describe("basic rendering", () => {
    it("renders the navbar with the correct title and app version", async () => {
      await renderNavbarWithSession(null);
      expect(screen.getByRole("link", { name: "Kurse" })).toBeTruthy();
      // Test for app version badge
      const appVersionBadge = screen.getByText(/v\d+\.\d+\.\d+/);
      expect(appVersionBadge).toBeTruthy();
    });
  });

  describe("rendering for authenticated users", () => {
    describe("when the user is an admin", () => {
      it("renders the admin and enrollments links", async () => {
        await renderNavbarWithSession({
          user: {
            role: "ADMIN",
            email: "admin@example.com",
            name: "Admin User",
          },
        });

        expect(screen.getByRole("link", { name: "Admin" })).toBeTruthy();
        expect(screen.getByRole("link", { name: "Enrollments" })).toBeTruthy();
        expect(
          screen.getByRole("link", { name: "Dashboard" }).getAttribute("href"),
        ).toBe("/admin/dashboard");
        expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
      });

      it("does not render the learning link", async () => {
        await renderNavbarWithSession({
          user: {
            role: "ADMIN",
            email: "admin@example.com",
            name: "Admin User",
          },
        });

        expect(screen.queryByRole("link", { name: "Learning" })).toBeNull();
      });
    });

    describe("when the user is a student", () => {
      it("renders the learning link and hides admin-only links", async () => {
        await renderNavbarWithSession({
          user: {
            role: "STUDENT",
            email: "student@example.com",
            name: "Student User",
          },
        });

        expect(screen.getByRole("link", { name: "Learning" })).toBeTruthy();
        expect(
          screen.getByRole("link", { name: "Dashboard" }).getAttribute("href"),
        ).toBe("/user/dashboard");
        expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
        expect(screen.queryByRole("link", { name: "Enrollments" })).toBeNull();
      });

      it("shows the sign out action for authenticated users", async () => {
        await renderNavbarWithSession({
          user: {
            role: "STUDENT",
            email: "student@example.com",
            name: "Student User",
          },
        });

        expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
      });
    });
  });
});
