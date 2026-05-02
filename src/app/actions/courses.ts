"use server";

import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { getDb } from "@/db";
import { courses } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";

export type SaveCourseStoryboardInput = {
  courseId: string;
  expectedVersion: number;
  payload: ApiCoursePayload;
};

export type SaveCourseStoryboardResult =
  | {
      ok: true;
      version: number;
      payload: ApiCoursePayload;
    }
  | {
      ok: false;
      code: "VERSION_CONFLICT" | "VALIDATION" | "UNKNOWN";
      message: string;
    };

type PersistedCourseStructure = {
  courseId: string;
  modules: ApiCoursePayload["modules"];
  metadata: {
    synopsis: string;
    audience: string;
    estimatedDuration: string;
  };
};

function toPersistedStructure(
  payload: ApiCoursePayload,
): PersistedCourseStructure {
  return {
    courseId: payload.id,
    modules: payload.modules,
    metadata: {
      synopsis: payload.synopsis,
      audience: payload.audience,
      estimatedDuration: payload.estimatedDuration,
    },
  };
}

export async function fetchSeededCourses() {
  const db = getDb();
  return db?.select().from(courses);
}

export async function fetchCourseBySlug(slug: string) {
  const db = getDb();

  const course = await db?.select().from(courses).where(eq(courses.slug, slug));

  return course ? course[0] : notFound();
}

export async function saveCourseStoryboard(
  input: SaveCourseStoryboardInput,
): Promise<SaveCourseStoryboardResult> {
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "expectedVersion must be an integer greater than 0.",
    };
  }

  const db = getDb();

  if (!db) {
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Database is not configured.",
    };
  }

  const nextStructure = toPersistedStructure(input.payload);

  try {
    const [updatedCourse] = await db
      .update(courses)
      .set({
        structure: nextStructure,
        status: input.payload.status,
        description: input.payload.synopsis,
        version: sql`${courses.version} + 1`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(courses.id, input.courseId),
          eq(courses.version, input.expectedVersion),
        ),
      )
      .returning({
        id: courses.id,
        version: courses.version,
      });

    if (!updatedCourse) {
      return {
        ok: false,
        code: "VERSION_CONFLICT",
        message:
          "This storyboard changed elsewhere. Refresh to get the latest version.",
      };
    }

    return {
      ok: true,
      version: updatedCourse.version,
      payload: {
        ...input.payload,
        version: updatedCourse.version,
      },
    };
  } catch (error) {
    console.error("Error saving course storyboard:", error);
    return {
      ok: false,
      code: "UNKNOWN",
      message: "Unable to save storyboard right now.",
    };
  }
}
