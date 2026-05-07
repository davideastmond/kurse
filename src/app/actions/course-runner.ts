"use server";

import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { enrollments, lessonProgress } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type CompleteLessonInput = {
  enrollmentId: string;
  lessonId: string;
  courseSlug: string;
};

type CompleteLessonResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

export async function completeLessonProgress(
  input: CompleteLessonInput,
): Promise<CompleteLessonResult> {
  const session = await getSessionSafely();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      ok: false,
      message: "You must be signed in.",
    };
  }

  if (!input.enrollmentId || !input.lessonId || !input.courseSlug) {
    return {
      ok: false,
      message: "Enrollment, lesson, and course slug are required.",
    };
  }

  const db = getDb();

  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  const [enrollment] = await db
    .select({
      id: enrollments.id,
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.id, input.enrollmentId),
        eq(enrollments.userId, userId),
      ),
    )
    .limit(1);

  if (!enrollment) {
    return {
      ok: false,
      message: "Enrollment not found.",
    };
  }

  try {
    await db
      .insert(lessonProgress)
      .values({
        enrollmentId: input.enrollmentId,
        lessonId: input.lessonId,
      })
      .onConflictDoNothing();

    revalidatePath(`/user/learn/${input.courseSlug}`);

    return {
      ok: true,
    };
  } catch (error) {
    console.error("Failed to complete lesson progress:", error);

    return {
      ok: false,
      message: "Unable to update lesson progress right now.",
    };
  }
}
