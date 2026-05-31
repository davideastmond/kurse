import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth/session", () => ({
  getSessionSafely: vi.fn(),
}));

vi.mock("@/auth/auth", () => ({
  requireOrganizationAdminOrOwner: vi.fn(),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db/schema", () => ({
  courses: { id: "courses.id" },
  enrollments: {
    userId: "enrollments.user_id",
    courseId: "enrollments.course_id",
  },
  organizationCourseAssignments: {
    id: "organization_course_assignments.id",
    organizationId: "organization_course_assignments.organization_id",
    courseId: "organization_course_assignments.course_id",
    assignedByUserId: "organization_course_assignments.assigned_by_user_id",
  },
  organizationMemberCourseAssignments: {
    organizationId: "organization_member_course_assignments.organization_id",
    userId: "organization_member_course_assignments.user_id",
    courseId: "organization_member_course_assignments.course_id",
  },
  organizationMemberships: {
    organizationId: "organization_memberships.organization_id",
    userId: "organization_memberships.user_id",
    state: "organization_memberships.state",
  },
  organizations: {
    id: "organizations.id",
    status: "organizations.status",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ args })),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  inArray: vi.fn((left: unknown, right: unknown) => ({ left, right })),
}));

import { requireOrganizationAdminOrOwner } from "@/auth/auth";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { revalidatePath } from "next/cache";
import { assignCourseToOrganizationMembers } from "./organization-assignments";

const mockedGetSessionSafely = vi.mocked(getSessionSafely);
const mockedRequireOrganizationAdminOrOwner = vi.mocked(
  requireOrganizationAdminOrOwner,
);
const mockedGetDb = vi.mocked(getDb);
const mockedRevalidatePath = vi.mocked(revalidatePath);

function createSuccessDbMock() {
  const select = vi
    .fn()
    .mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "org-1" }],
        }),
      }),
    }))
    .mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: "course-1" }],
        }),
      }),
    }))
    .mockImplementationOnce(() => ({
      from: () => ({
        where: async () => [{ userId: "member-1" }, { userId: "member-2" }],
      }),
    }));

  const insert = vi
    .fn()
    .mockImplementationOnce(() => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => [{ id: "source-assignment-1" }],
        }),
      }),
    }))
    .mockImplementationOnce(() => ({
      values: () => ({
        onConflictDoNothing: async () => undefined,
      }),
    }))
    .mockImplementationOnce(() => ({
      values: () => ({
        onConflictDoNothing: async () => undefined,
      }),
    }));

  return {
    select,
    insert,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("assignCourseToOrganizationMembers", () => {
  const validInput = {
    organizationId: "11111111-1111-4111-8111-111111111111",
    courseId: "22222222-2222-4222-8222-222222222222",
    memberUserIds: ["33333333-3333-4333-8333-333333333333"],
  };

  it("returns an auth error when user is not signed in", async () => {
    mockedGetSessionSafely.mockResolvedValue(null as never);

    const result = await assignCourseToOrganizationMembers(validInput);

    expect(result).toEqual({
      ok: false,
      message: "You must be signed in to assign courses.",
    });
  });

  it("returns guard error when user is not org admin/owner", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: false,
      message: "No access",
    });

    const result = await assignCourseToOrganizationMembers(validInput);

    expect(result).toEqual({ ok: false, message: "No access" });
  });

  it("returns db error when database is unavailable", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: true,
      role: "ADMIN",
    });
    mockedGetDb.mockReturnValue(null);

    const result = await assignCourseToOrganizationMembers(validInput);

    expect(result).toEqual({
      ok: false,
      message: "Database is not configured.",
    });
  });

  it("creates org/member assignments and enrollments on success", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: true,
      role: "OWNER",
    });

    const dbMock = createSuccessDbMock();
    mockedGetDb.mockReturnValue(dbMock as never);

    const result = await assignCourseToOrganizationMembers({
      organizationId: "11111111-1111-4111-8111-111111111111",
      courseId: "22222222-2222-4222-8222-222222222222",
      memberUserIds: [
        "33333333-3333-4333-8333-333333333333",
        "44444444-4444-4444-8444-444444444444",
      ],
    });

    expect(result).toEqual({ ok: true });
    expect(dbMock.select).toHaveBeenCalledTimes(3);
    expect(dbMock.insert).toHaveBeenCalledTimes(3);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/user/dashboard");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin");
  });
});
