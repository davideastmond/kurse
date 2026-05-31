"use server";

import {
  getOrganizationMembershipForUser,
  requireOrganizationAdminOrOwner,
} from "@/auth/auth";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import {
  organizationInvites,
  organizationMemberships,
  organizations,
  organizationSeatLedger,
} from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

type OrganizationActionResult = {
  ok: boolean;
  message?: string;
};

type CreateOrganizationInput = {
  name: string;
  slug?: string;
  initialSeats?: number;
};

type CreateOrganizationResult =
  | (OrganizationActionResult & {
      ok: true;
      organizationId: string;
      organizationSlug: string;
    })
  | OrganizationActionResult;

type InviteOrganizationMemberInput = {
  organizationId: string;
  email: string;
  role?: "ADMIN" | "MEMBER";
  expiresInDays?: number;
};

type InviteOrganizationMemberResult =
  | (OrganizationActionResult & {
      ok: true;
      inviteId: string;
      inviteToken: string;
      expiresAt: string;
    })
  | OrganizationActionResult;

type AcceptOrganizationInviteInput = {
  token: string;
};

type AcceptOrganizationInviteResult =
  | (OrganizationActionResult & {
      ok: true;
      organizationId: string;
    })
  | OrganizationActionResult;

type RevokeOrganizationMembershipInput = {
  organizationId: string;
  userId: string;
};

const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required."),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  initialSeats: z.number().int().min(1).max(100000).optional(),
});

const inviteOrganizationMemberSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

const acceptOrganizationInviteSchema = z.object({
  token: z.string().trim().min(32),
});

const revokeOrganizationMembershipSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
});

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return normalized || "organization";
}

function createOrganizationSlug(name: string) {
  const suffix = Date.now().toString(36).slice(-6);
  return `${slugify(name)}-${suffix}`;
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const session = await getSessionSafely();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "You must be signed in to create an organization.",
    };
  }

  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid organization input.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  const initialSeats = parsed.data.initialSeats ?? 1;
  const slug = parsed.data.slug || createOrganizationSlug(parsed.data.name);

  const [createdOrganization] = await db
    .insert(organizations)
    .values({
      name: parsed.data.name,
      slug,
      ownerUserId: userId,
    })
    .onConflictDoNothing()
    .returning({
      id: organizations.id,
      slug: organizations.slug,
    });

  if (!createdOrganization) {
    return {
      ok: false,
      message: "Organization slug already exists. Try a different slug.",
    };
  }

  await db
    .insert(organizationMemberships)
    .values({
      organizationId: createdOrganization.id,
      userId,
      role: "OWNER",
      state: "ACTIVE",
    })
    .onConflictDoUpdate({
      target: [
        organizationMemberships.organizationId,
        organizationMemberships.userId,
      ],
      set: {
        role: "OWNER",
        state: "ACTIVE",
        updatedAt: new Date(),
      },
    });

  await db.insert(organizationSeatLedger).values({
    organizationId: createdOrganization.id,
    delta: initialSeats,
    reason: "INITIAL_ALLOCATION",
    actorUserId: userId,
  });

  revalidatePath("/admin");

  return {
    ok: true,
    organizationId: createdOrganization.id,
    organizationSlug: createdOrganization.slug,
  };
}

export async function inviteOrganizationMember(
  input: InviteOrganizationMemberInput,
): Promise<InviteOrganizationMemberResult> {
  const session = await getSessionSafely();
  const actorUserId = session?.user?.id;

  if (!actorUserId) {
    return {
      ok: false,
      message: "You must be signed in to invite members.",
    };
  }

  const parsed = inviteOrganizationMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid invite input.",
    };
  }

  const access = await requireOrganizationAdminOrOwner({
    organizationId: parsed.data.organizationId,
    userId: actorUserId,
  });

  if (!access.ok) {
    return {
      ok: false,
      message: access.message,
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  const inviteToken = randomBytes(24).toString("hex");
  const tokenHash = hashInviteToken(inviteToken);
  const expiresAt = new Date(
    Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000,
  );

  await db
    .update(organizationInvites)
    .set({
      state: "REVOKED",
    })
    .where(
      and(
        eq(organizationInvites.organizationId, parsed.data.organizationId),
        eq(organizationInvites.email, parsed.data.email),
        eq(organizationInvites.state, "PENDING"),
      ),
    );

  const [createdInvite] = await db
    .insert(organizationInvites)
    .values({
      organizationId: parsed.data.organizationId,
      email: parsed.data.email,
      role: parsed.data.role,
      state: "PENDING",
      tokenHash,
      expiresAt,
    })
    .returning({
      id: organizationInvites.id,
      expiresAt: organizationInvites.expiresAt,
    });

  if (!createdInvite) {
    return {
      ok: false,
      message: "Unable to create invite right now.",
    };
  }

  revalidatePath("/admin");

  return {
    ok: true,
    inviteId: createdInvite.id,
    inviteToken,
    expiresAt: createdInvite.expiresAt.toISOString(),
  };
}

export async function acceptOrganizationInvite(
  input: AcceptOrganizationInviteInput,
): Promise<AcceptOrganizationInviteResult> {
  const session = await getSessionSafely();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email?.trim().toLowerCase();

  if (!userId || !userEmail) {
    return {
      ok: false,
      message: "You must be signed in to accept an invite.",
    };
  }

  const parsed = acceptOrganizationInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Invalid invite token.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  const tokenHash = hashInviteToken(parsed.data.token);

  const [invite] = await db
    .select({
      id: organizationInvites.id,
      organizationId: organizationInvites.organizationId,
      email: organizationInvites.email,
      role: organizationInvites.role,
      state: organizationInvites.state,
      expiresAt: organizationInvites.expiresAt,
    })
    .from(organizationInvites)
    .innerJoin(
      organizations,
      eq(organizationInvites.organizationId, organizations.id),
    )
    .where(
      and(
        eq(organizationInvites.tokenHash, tokenHash),
        eq(organizations.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!invite) {
    return {
      ok: false,
      message: "Invite not found.",
    };
  }

  if (invite.email !== userEmail) {
    return {
      ok: false,
      message: "This invite was issued for a different email address.",
    };
  }

  if (invite.state !== "PENDING") {
    return {
      ok: false,
      message: "This invite can no longer be accepted.",
    };
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    await db
      .update(organizationInvites)
      .set({
        state: "EXPIRED",
      })
      .where(eq(organizationInvites.id, invite.id));

    return {
      ok: false,
      message: "This invite has expired.",
    };
  }

  const existingMembership = await getOrganizationMembershipForUser({
    organizationId: invite.organizationId,
    userId,
  });

  if (!existingMembership || existingMembership.state !== "ACTIVE") {
    const [totalSeatRow] = await db
      .select({
        totalSeats: sql<number>`COALESCE(SUM(${organizationSeatLedger.delta}), 0)`,
      })
      .from(organizationSeatLedger)
      .where(eq(organizationSeatLedger.organizationId, invite.organizationId));

    const [usedSeatRow] = await db
      .select({
        usedSeats: sql<number>`COUNT(*)`,
      })
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, invite.organizationId),
          eq(organizationMemberships.state, "ACTIVE"),
        ),
      );

    const totalSeats = toNumber(totalSeatRow?.totalSeats);
    const usedSeats = toNumber(usedSeatRow?.usedSeats);

    if (usedSeats >= totalSeats) {
      return {
        ok: false,
        message: "No seats are available for this organization.",
      };
    }
  }

  await db
    .insert(organizationMemberships)
    .values({
      organizationId: invite.organizationId,
      userId,
      role: invite.role,
      state: "ACTIVE",
    })
    .onConflictDoUpdate({
      target: [
        organizationMemberships.organizationId,
        organizationMemberships.userId,
      ],
      set: {
        role: invite.role,
        state: "ACTIVE",
        updatedAt: new Date(),
      },
    });

  if (!existingMembership || existingMembership.state !== "ACTIVE") {
    await db.insert(organizationSeatLedger).values({
      organizationId: invite.organizationId,
      delta: 1,
      reason: "MEMBERSHIP_ACTIVATED",
      actorUserId: userId,
    });
  }

  await db
    .update(organizationInvites)
    .set({
      state: "ACCEPTED",
      acceptedAt: new Date(),
    })
    .where(eq(organizationInvites.id, invite.id));

  revalidatePath("/admin");
  revalidatePath("/user/dashboard");

  return {
    ok: true,
    organizationId: invite.organizationId,
  };
}

export async function revokeOrganizationMembership(
  input: RevokeOrganizationMembershipInput,
): Promise<OrganizationActionResult> {
  const session = await getSessionSafely();
  const actorUserId = session?.user?.id;

  if (!actorUserId) {
    return {
      ok: false,
      message: "You must be signed in to revoke memberships.",
    };
  }

  const parsed = revokeOrganizationMembershipSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid revoke input.",
    };
  }

  const access = await requireOrganizationAdminOrOwner({
    organizationId: parsed.data.organizationId,
    userId: actorUserId,
  });

  if (!access.ok) {
    return {
      ok: false,
      message: access.message,
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  const membership = await getOrganizationMembershipForUser({
    organizationId: parsed.data.organizationId,
    userId: parsed.data.userId,
  });

  if (!membership) {
    return {
      ok: true,
    };
  }

  if (membership.role === "OWNER") {
    return {
      ok: false,
      message: "Organization owners cannot be revoked.",
    };
  }

  if (membership.state === "REVOKED") {
    return {
      ok: true,
    };
  }

  await db
    .update(organizationMemberships)
    .set({
      state: "REVOKED",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(organizationMemberships.organizationId, parsed.data.organizationId),
        eq(organizationMemberships.userId, parsed.data.userId),
      ),
    );

  await db.insert(organizationSeatLedger).values({
    organizationId: parsed.data.organizationId,
    delta: -1,
    reason: "MEMBERSHIP_REVOKED",
    actorUserId,
  });

  revalidatePath("/admin");

  return {
    ok: true,
  };
}
