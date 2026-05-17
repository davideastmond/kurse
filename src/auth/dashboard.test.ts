import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/schema", () => ({
  users: {
    role: "role",
    email: "email",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
}));

import { getDb } from "@/db";
import { eq } from "drizzle-orm";
import { getDashboardPathForEmail, getDashboardPathForRole } from "./dashboard";

type DashboardUserRow = {
  role?: string | null;
};

function createMockDb(rows: DashboardUserRow[]) {
  const limit = vi.fn(async () => rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return {
    db: { select },
    spies: {
      select,
      from,
      where,
      limit,
    },
  };
}

const mockedGetDb = vi.mocked(getDb);
const mockedEq = vi.mocked(eq);

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe("getDashboardPathForEmail", () => {
  it("returns user dashboard for empty email", async () => {
    const result = await getDashboardPathForEmail(undefined);

    expect(result).toBe("/user/dashboard");
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("returns user dashboard when database is unavailable", async () => {
    mockedGetDb.mockReturnValue(null);

    const result = await getDashboardPathForEmail("admin@example.com");

    expect(result).toBe("/user/dashboard");
  });

  it("normalizes email and routes admin users to admin dashboard", async () => {
    const { db, spies } = createMockDb([{ role: "ADMIN" }]);
    mockedGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await getDashboardPathForEmail("  ADMIN@Example.COM  ");

    expect(result).toBe("/admin/dashboard");
    expect(mockedEq).toHaveBeenCalledWith("email", "admin@example.com");
    expect(spies.select).toHaveBeenCalled();
    expect(spies.from).toHaveBeenCalled();
    expect(spies.where).toHaveBeenCalled();
    expect(spies.limit).toHaveBeenCalledWith(1);
  });

  it("returns user dashboard when no matching user exists", async () => {
    const { db } = createMockDb([]);
    mockedGetDb.mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    const result = await getDashboardPathForEmail("missing@example.com");

    expect(result).toBe("/user/dashboard");
  });
});
