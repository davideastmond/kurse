"use server";

import { enqueueWebhookEvent } from "@/app/actions/webhooks";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { enrollments, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type EnrollmentActionResult = {
  ok: boolean;
  message?: string;
};

type StudentEnrollmentInput = {
  courseId: string;
  studentId: string;
};

type CourseEnrollmentInput = {
  courseId: string;
};

async function emitEnrollmentCreatedEvents(
  rows: Array<{ id: string; courseId: string; userId: string }>,
) {
  for (const row of rows) {
    const enqueueResult = await enqueueWebhookEvent({
      eventType: "enrollment.created",
      data: {
        enrollmentId: row.id,
        courseId: row.courseId,
        userId: row.userId,
      },
    });

    if (!enqueueResult.ok) {
      console.error("Failed to enqueue enrollment.created webhook event:", {
        enrollmentId: row.id,
        message: enqueueResult.message,
      });
    }
  }
}

async function ensureAdminAccess(): Promise<EnrollmentActionResult | null> {
  const session = await getSessionSafely();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return {
      ok: false,
      message: "You are not authorized to manage enrollments.",
    };
  }

  return null;
}

function validateCourseId(courseId: string) {
  return courseId.trim().length > 0;
}

function validateStudentId(studentId: string) {
  return studentId.trim().length > 0;
}

export async function enrollStudentInCourse(
  input: StudentEnrollmentInput,
): Promise<EnrollmentActionResult> {
  const accessError = await ensureAdminAccess();
  if (accessError) {
    return accessError;
  }

  if (
    !validateCourseId(input.courseId) ||
    !validateStudentId(input.studentId)
  ) {
    return {
      ok: false,
      message: "Course and student are required.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  try {
    const insertedEnrollments = await db
      .insert(enrollments)
      .values({
        courseId: input.courseId,
        userId: input.studentId,
      })
      .onConflictDoNothing()
      .returning({
        id: enrollments.id,
        courseId: enrollments.courseId,
        userId: enrollments.userId,
      });

    if (insertedEnrollments.length > 0) {
      await emitEnrollmentCreatedEvents(insertedEnrollments);
    }

    revalidatePath("/admin/enrollments");

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to enroll student:", error);
    return {
      ok: false,
      message: "Unable to enroll student right now.",
    };
  }
}

export async function removeStudentFromCourse(
  input: StudentEnrollmentInput,
): Promise<EnrollmentActionResult> {
  const accessError = await ensureAdminAccess();
  if (accessError) {
    return accessError;
  }

  if (
    !validateCourseId(input.courseId) ||
    !validateStudentId(input.studentId)
  ) {
    return {
      ok: false,
      message: "Course and student are required.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  try {
    await db
      .delete(enrollments)
      .where(
        and(
          eq(enrollments.courseId, input.courseId),
          eq(enrollments.userId, input.studentId),
        ),
      );

    revalidatePath("/admin/enrollments");

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to remove enrollment:", error);
    return {
      ok: false,
      message: "Unable to remove enrollment right now.",
    };
  }
}

export async function enrollAllStudentsInCourse(
  input: CourseEnrollmentInput,
): Promise<EnrollmentActionResult> {
  const accessError = await ensureAdminAccess();
  if (accessError) {
    return accessError;
  }

  if (!validateCourseId(input.courseId)) {
    return {
      ok: false,
      message: "Course is required.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  try {
    const studentRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "STUDENT"));

    let insertedEnrollments: Array<{
      id: string;
      courseId: string;
      userId: string;
    }> = [];

    if (studentRows.length > 0) {
      insertedEnrollments = await db
        .insert(enrollments)
        .values(
          studentRows.map((student) => ({
            courseId: input.courseId,
            userId: student.id,
          })),
        )
        .onConflictDoNothing()
        .returning({
          id: enrollments.id,
          courseId: enrollments.courseId,
          userId: enrollments.userId,
        });
    }

    if (insertedEnrollments.length > 0) {
      await emitEnrollmentCreatedEvents(insertedEnrollments);
    }

    revalidatePath("/admin/enrollments");

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to enroll all students:", error);
    return {
      ok: false,
      message: "Unable to enroll all students right now.",
    };
  }
}

export async function removeAllStudentsFromCourse(
  input: CourseEnrollmentInput,
): Promise<EnrollmentActionResult> {
  const accessError = await ensureAdminAccess();
  if (accessError) {
    return accessError;
  }

  if (!validateCourseId(input.courseId)) {
    return {
      ok: false,
      message: "Course is required.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  try {
    await db
      .delete(enrollments)
      .where(eq(enrollments.courseId, input.courseId));

    revalidatePath("/admin/enrollments");

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to remove all students:", error);
    return {
      ok: false,
      message: "Unable to remove all students right now.",
    };
  }
}
