"use server";

import { requireOrganizationAdminOrOwner } from "@/auth/auth";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import {
  courses,
  enrollments,
  organizationCourseAssignments,
  organizationMemberCourseAssignments,
  organizationMemberships,
  organizations,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type OrganizationAssignmentActionResult = {
  ok: boolean;
  message?: string;
};

type AssignCourseToMembersInput = {
  organizationId: string;
  courseId: string;
  memberUserIds: string[];
};

const assignCourseToMembersSchema = z.object({
  organizationId: z.string().uuid(),
  courseId: z.string().uuid(),
  memberUserIds: z.array(z.string().uuid()).min(1),
});

export async function assignCourseToOrganizationMembers(
  input: AssignCourseToMembersInput,
): Promise<OrganizationAssignmentActionResult> {
  const session = await getSessionSafely();
  const actorUserId = session?.user?.id;

  if (!actorUserId) {
    return {
      ok: false,
      message: "You must be signed in to assign courses.",
    };
  }

  const parsed = assignCourseToMembersSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid assignment input.",
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

  const [activeOrganization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        eq(organizations.id, parsed.data.organizationId),
        eq(organizations.status, "ACTIVE"),
      ),
    )
    .limit(1);

  if (!activeOrganization) {
    return {
      ok: false,
      message: "Organization not found or inactive.",
    };
  }

  const [course] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.id, parsed.data.courseId))
    .limit(1);

  if (!course) {
    return {
      ok: false,
      message: "Course not found.",
    };
  }

  const activeMembers = await db
    .select({ userId: organizationMemberships.userId })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, parsed.data.organizationId),
        eq(organizationMemberships.state, "ACTIVE"),
        inArray(organizationMemberships.userId, parsed.data.memberUserIds),
      ),
    );

  if (activeMembers.length === 0) {
    return {
      ok: false,
      message: "No active members selected.",
    };
  }

  const [sourceAssignment] = await db
    .insert(organizationCourseAssignments)
    .values({
      organizationId: parsed.data.organizationId,
      courseId: parsed.data.courseId,
      assignedByUserId: actorUserId,
    })
    .onConflictDoUpdate({
      target: [
        organizationCourseAssignments.organizationId,
        organizationCourseAssignments.courseId,
      ],
      set: {
        assignedByUserId: actorUserId,
      },
    })
    .returning({ id: organizationCourseAssignments.id });

  await db
    .insert(organizationMemberCourseAssignments)
    .values(
      activeMembers.map((member) => ({
        organizationId: parsed.data.organizationId,
        userId: member.userId,
        courseId: parsed.data.courseId,
        sourceAssignmentId: sourceAssignment?.id ?? null,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(enrollments)
    .values(
      activeMembers.map((member) => ({
        userId: member.userId,
        courseId: parsed.data.courseId,
      })),
    )
    .onConflictDoNothing();

  revalidatePath("/user/dashboard");
  revalidatePath("/admin");

  return {
    ok: true,
  };
}
