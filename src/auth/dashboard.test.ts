import { describe, expect, it } from "vitest";

import { getDashboardPathForRole } from "./dashboard";

describe("getDashboardPathForRole", () => {
  it("routes admins to the admin dashboard", () => {
    expect(getDashboardPathForRole("ADMIN")).toBe("/admin/dashboard");
  });

  it("routes students to the user dashboard", () => {
    expect(getDashboardPathForRole("STUDENT")).toBe("/user/dashboard");
  });

  it("routes unknown roles to the user dashboard", () => {
    expect(getDashboardPathForRole("TEACHER")).toBe("/user/dashboard");
  });

  it("routes missing roles to the user dashboard", () => {
    expect(getDashboardPathForRole(undefined)).toBe("/user/dashboard");
    expect(getDashboardPathForRole(null)).toBe("/user/dashboard");
  });
});
