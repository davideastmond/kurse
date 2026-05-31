import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth/session", () => ({
  getSessionSafely: vi.fn(),
}));

vi.mock("@/auth/auth", () => ({
  requireOrganizationAdminOrOwner: vi.fn(),
  getOrganizationMembershipForUser: vi.fn(),
}));

vi.mock("@/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/db/schema", () => ({
  organizationInvites: {
    id: "organization_invites.id",
    organizationId: "organization_invites.organization_id",
    email: "organization_invites.email",
    state: "organization_invites.state",
    expiresAt: "organization_invites.expires_at",
  },
  organizationMemberships: {
    organizationId: "organization_memberships.organization_id",
    userId: "organization_memberships.user_id",
  },
  organizations: {
    id: "organizations.id",
    slug: "organizations.slug",
  },
  organizationSeatLedger: {
    delta: "organization_seat_ledger.delta",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ args })),
  eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
  sql: vi.fn((strings: TemplateStringsArray) => strings.join("")),
}));

import {
  getOrganizationMembershipForUser,
  requireOrganizationAdminOrOwner,
} from "@/auth/auth";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { revalidatePath } from "next/cache";
import {
  inviteOrganizationMember,
  revokeOrganizationMembership,
} from "./organizations";

const mockedGetSessionSafely = vi.mocked(getSessionSafely);
const mockedGetDb = vi.mocked(getDb);
const mockedRequireOrganizationAdminOrOwner = vi.mocked(
  requireOrganizationAdminOrOwner,
);
const mockedGetOrganizationMembershipForUser = vi.mocked(
  getOrganizationMembershipForUser,
);
const mockedRevalidatePath = vi.mocked(revalidatePath);

function createInviteDbMock() {
  const update = vi.fn(() => ({
    set: () => ({
      where: async () => undefined,
    }),
  }));

  const insert = vi.fn(() => ({
    values: () => ({
      returning: async () => [
        {
          id: "invite-1",
          expiresAt: new Date("2026-06-10T10:00:00.000Z"),
        },
      ],
    }),
  }));

  return { update, insert };
}

function createRevokeDbMock() {
  const update = vi.fn(() => ({
    set: () => ({
      where: async () => undefined,
    }),
  }));

  const insert = vi.fn(() => ({
    values: async () => undefined,
  }));

  return { update, insert };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("inviteOrganizationMember", () => {
  const validInput = {
    organizationId: "11111111-1111-4111-8111-111111111111",
    email: "learner@example.com",
    role: "MEMBER" as const,
  };

  it("returns auth error when not signed in", async () => {
    mockedGetSessionSafely.mockResolvedValue(null as never);

    const result = await inviteOrganizationMember(validInput);

    expect(result).toEqual({
      ok: false,
      message: "You must be signed in to invite members.",
    });
  });

  it("returns guard error when caller lacks org admin access", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: false,
      message: "No access",
    });

    const result = await inviteOrganizationMember(validInput);

    expect(result).toEqual({ ok: false, message: "No access" });
  });

  it("returns db error when db is missing", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: true,
      role: "ADMIN",
    });
    mockedGetDb.mockReturnValue(null);

    const result = await inviteOrganizationMember(validInput);

    expect(result).toEqual({
      ok: false,
      message: "Database is not configured.",
    });
  });

  it("creates invite and revalidates admin paths", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "user-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: true,
      role: "OWNER",
    });

    const dbMock = createInviteDbMock();
    mockedGetDb.mockReturnValue(dbMock as never);

    const result = await inviteOrganizationMember(validInput);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.inviteId).toBe("invite-1");
    expect(result.inviteToken.length).toBeGreaterThan(20);
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("revokeOrganizationMembership", () => {
  const validInput = {
    organizationId: "11111111-1111-4111-8111-111111111111",
    userId: "33333333-3333-4333-8333-333333333333",
  };

  it("blocks owner revocation", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "admin-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: true,
      role: "ADMIN",
    });
    mockedGetDb.mockReturnValue(createRevokeDbMock() as never);
    mockedGetOrganizationMembershipForUser.mockResolvedValue({
      organizationId: validInput.organizationId,
      role: "OWNER",
      state: "ACTIVE",
    });

    const result = await revokeOrganizationMembership(validInput);

    expect(result).toEqual({
      ok: false,
      message: "Organization owners cannot be revoked.",
    });
  });

  it("marks membership revoked and writes seat ledger entry", async () => {
    mockedGetSessionSafely.mockResolvedValue({
      user: { id: "admin-1" },
    } as never);
    mockedRequireOrganizationAdminOrOwner.mockResolvedValue({
      ok: true,
      role: "OWNER",
    });

    const dbMock = createRevokeDbMock();
    mockedGetDb.mockReturnValue(dbMock as never);
    mockedGetOrganizationMembershipForUser.mockResolvedValue({
      organizationId: validInput.organizationId,
      role: "MEMBER",
      state: "ACTIVE",
    });

    const result = await revokeOrganizationMembership(validInput);

    expect(result).toEqual({ ok: true });
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(dbMock.insert).toHaveBeenCalledTimes(1);
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/admin");
  });
});
