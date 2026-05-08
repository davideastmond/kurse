"use server";

import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { courses } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
  courseEvaluation?: ApiCoursePayload["courseEvaluation"];
  modules: ApiCoursePayload["modules"];
  metadata: {
    synopsis: string;
    audience: string;
    estimatedDuration: string;
  };
};

type CreateCourseInput = {
  title: string;
  description: string;
};

type CreateCourseResult =
  | {
      ok: true;
      slug: string;
      id: string;
    }
  | {
      ok: false;
      message: string;
    };

function createEntityId(prefix: "module" | "lesson") {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  return `${prefix}_${randomPart}`;
}

function slugify(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return normalized || "untitled-course";
}

function createUniqueSlug(baseSlug: string) {
  const suffix = Date.now().toString(36).slice(-6);
  return `${baseSlug}-${suffix}`;
}

function toPersistedStructure(
  payload: ApiCoursePayload,
): PersistedCourseStructure {
  return {
    courseId: payload.id,
    courseEvaluation: payload.courseEvaluation,
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
  return db
    ?.select({
      id: courses.id,
      slug: courses.slug,
      description: courses.description,
      status: courses.status,
      version: courses.version,
      updatedAt: courses.updatedAt,
      title: courses.title,
    })
    .from(courses);
}

export async function fetchCourseBySlug(slug: string) {
  const db = getDb();

  const course = await db?.select().from(courses).where(eq(courses.slug, slug));

  return course ? course[0] : notFound();
}

export async function createCourse(
  input: CreateCourseInput,
): Promise<CreateCourseResult> {
  const session = await getSessionSafely();
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  if (!userId || userRole !== "ADMIN") {
    return {
      ok: false,
      message: "You are not authorized to create courses.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      message: "Database is not configured.",
    };
  }

  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    return {
      ok: false,
      message: "A course title is required.",
    };
  }

  if (!description) {
    return {
      ok: false,
      message: "A course description is required.",
    };
  }

  const moduleId = createEntityId("module");
  const lessonId = createEntityId("lesson");

  const slug = createUniqueSlug(slugify(title));

  const initialStructure: PersistedCourseStructure = {
    // Populated by a DB trigger on INSERT to keep this write atomic.
    courseId: "",
    modules: [
      {
        id: moduleId,
        title: "New Module",
        progressLabel: "0%",
        lessons: [
          {
            id: lessonId,
            title: "New Lesson",
            duration: "",
            objective: "",
            blocks: [],
          },
        ],
      },
    ],
    metadata: {
      synopsis: description,
      audience: "",
      estimatedDuration: "",
    },
  };

  try {
    const [created] = await db
      .insert(courses)
      .values({
        title,
        slug,
        description,
        status: "DRAFT",
        createdById: userId,
        structure: initialStructure,
      })
      .returning({
        id: courses.id,
        slug: courses.slug,
      });

    if (!created) {
      throw new Error("Unable to create course right now.");
    }

    revalidatePath("/admin/dashboard");

    return {
      ok: true,
      id: created.id,
      slug: created.slug,
    };
  } catch (error) {
    console.error("Error creating course:", error);

    return {
      ok: false,
      message: "Unable to create course right now.",
    };
  }
}

export async function saveCourseStoryboard(
  input: SaveCourseStoryboardInput,
): Promise<SaveCourseStoryboardResult> {
  // TODO: validation and security checks (e.g. ensure user has permission to edit this course)
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
