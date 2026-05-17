"use server";

import { generateQuizQuestions } from "@/app/utils/claude-ai/claude-ai";
import { getRedisClientConnected } from "@/app/utils/redis/redis-client";
import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { courses } from "@/db/schema";
import type { StoryboardQuiz } from "@/shared/types/storyboard";
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
      code: "VERSION_CONFLICT" | "VALIDATION" | "FORBIDDEN" | "UNKNOWN";
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
    welcomeImages?: ApiCoursePayload["welcomeImages"];
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

export type GenerateCourseEvaluationQuizInput = {
  courseId: string;
  numberOfQuestions?: number;
};

export type GenerateCourseEvaluationQuizResult =
  | {
      ok: true;
      quiz: StoryboardQuiz;
    }
  | {
      ok: false;
      code:
        | "VALIDATION"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "RATE_LIMITED"
        | "UNKNOWN";
      message: string;
    };

const QUIZ_GENERATION_COOLDOWN_SECONDS = 20;
const QUIZ_GENERATION_HOURLY_LIMIT = 30;

function getHourlyBucket() {
  return new Date().toISOString().slice(0, 13);
}

function getSecondsUntilNextHourlyBucket() {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setUTCMinutes(0, 0, 0);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1);

  return Math.max(1, Math.ceil((nextHour.getTime() - now.getTime()) / 1000));
}

function formatRetryMessage(retryAfterSeconds: number) {
  if (retryAfterSeconds <= 1) {
    return "Please wait a second and try again.";
  }

  if (retryAfterSeconds < 60) {
    return `Please wait ${retryAfterSeconds}s before generating another quiz.`;
  }

  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Rate limit reached. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

async function evaluateQuizGenerationRateLimit(input: {
  userId: string;
  courseId: string;
}): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  try {
    const redis = await getRedisClientConnected();
    const cooldownKey = `quiz-gen:cooldown:${input.userId}:${input.courseId}`;
    const hourlyKey = `quiz-gen:hour:${input.userId}:${getHourlyBucket()}`;

    const cooldownSetResult = await redis.set(cooldownKey, "1", {
      EX: QUIZ_GENERATION_COOLDOWN_SECONDS,
      NX: true,
    });

    if (!cooldownSetResult) {
      const ttl = await redis.ttl(cooldownKey);
      return {
        allowed: false,
        retryAfterSeconds:
          typeof ttl === "number" && ttl > 0
            ? ttl
            : QUIZ_GENERATION_COOLDOWN_SECONDS,
      };
    }

    const currentHourCount = await redis.incr(hourlyKey);

    if (currentHourCount === 1) {
      await redis.expire(hourlyKey, 3600);
    }

    if (currentHourCount > QUIZ_GENERATION_HOURLY_LIMIT) {
      const hourTtl = await redis.ttl(hourlyKey);
      return {
        allowed: false,
        retryAfterSeconds:
          typeof hourTtl === "number" && hourTtl > 0 ? hourTtl : 3600,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error(
      "Redis rate limit check failed, continuing without blocking:",
      error,
    );
    return { allowed: true };
  }
}

function compactText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function appendContextLine(lines: string[], label: string, value?: string) {
  const normalized = value ? compactText(value) : "";
  if (!normalized) {
    return;
  }

  lines.push(`${label}: ${normalized}`);
}

function buildCourseQuizContext(args: {
  title: string;
  description: string;
  structure: PersistedCourseStructure;
}) {
  const lines: string[] = [];

  appendContextLine(lines, "Course title", args.title);
  appendContextLine(lines, "Course description", args.description);
  appendContextLine(lines, "Synopsis", args.structure.metadata?.synopsis);
  appendContextLine(lines, "Audience", args.structure.metadata?.audience);
  appendContextLine(
    lines,
    "Estimated duration",
    args.structure.metadata?.estimatedDuration,
  );

  const modules = Array.isArray(args.structure.modules)
    ? args.structure.modules
    : [];

  for (const [moduleIndex, moduleItem] of modules.entries()) {
    appendContextLine(
      lines,
      `Module ${moduleIndex + 1} title`,
      moduleItem.title,
    );

    for (const [lessonIndex, lessonItem] of moduleItem.lessons.entries()) {
      appendContextLine(
        lines,
        `Module ${moduleIndex + 1} Lesson ${lessonIndex + 1} title`,
        lessonItem.title,
      );
      appendContextLine(
        lines,
        `Module ${moduleIndex + 1} Lesson ${lessonIndex + 1} objective`,
        lessonItem.objective,
      );

      for (const [blockIndex, blockItem] of lessonItem.blocks.entries()) {
        appendContextLine(
          lines,
          `Module ${moduleIndex + 1} Lesson ${lessonIndex + 1} Block ${blockIndex + 1} title`,
          blockItem.title,
        );
        appendContextLine(
          lines,
          `Module ${moduleIndex + 1} Lesson ${lessonIndex + 1} Block ${blockIndex + 1} detail`,
          blockItem.detail,
        );
      }
    }
  }

  const rawContext = lines.join("\n");
  if (rawContext.length <= 15000) {
    return rawContext;
  }

  return `${rawContext.slice(0, 15000)}\n[TRUNCATED]`;
}

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
      welcomeImages: payload.welcomeImages,
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
      createdById: courses.createdById,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      title: courses.title,
      structure: courses.structure,
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
      welcomeImages: [],
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
  const session = await getSessionSafely();
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  if (!userId || userRole !== "ADMIN") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You are not authorized to edit this storyboard.",
    };
  }

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
    const [courseOwner] = await db
      .select({ createdById: courses.createdById })
      .from(courses)
      .where(eq(courses.id, input.courseId))
      .limit(1);

    if (!courseOwner || courseOwner.createdById !== userId) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "You can only edit courses you created.",
      };
    }

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

export async function generateCourseEvaluationQuiz(
  input: GenerateCourseEvaluationQuizInput,
): Promise<GenerateCourseEvaluationQuizResult> {
  const session = await getSessionSafely();
  const userId = session?.user?.id;
  const userRole = session?.user?.role;

  if (!userId || userRole !== "ADMIN") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You are not authorized to generate quizzes.",
    };
  }

  if (!input.courseId.trim()) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "courseId is required.",
    };
  }

  if (
    input.numberOfQuestions !== undefined &&
    (!Number.isFinite(input.numberOfQuestions) || input.numberOfQuestions < 1)
  ) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "numberOfQuestions must be a positive number.",
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

  const [courseRow] = await db
    .select({
      title: courses.title,
      description: courses.description,
      createdById: courses.createdById,
      structure: courses.structure,
    })
    .from(courses)
    .where(eq(courses.id, input.courseId))
    .limit(1);

  if (!courseRow) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Course not found.",
    };
  }

  if (courseRow.createdById !== userId) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You can only generate quizzes for courses you created.",
    };
  }

  const rateLimit = await evaluateQuizGenerationRateLimit({
    userId,
    courseId: input.courseId,
  });

  if (!rateLimit.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: formatRetryMessage(rateLimit.retryAfterSeconds),
    };
  }

  const structure = (courseRow.structure ?? {
    courseId: input.courseId,
    modules: [],
    metadata: {
      synopsis: "",
      audience: "",
      estimatedDuration: "",
    },
  }) as PersistedCourseStructure;

  const courseContent = buildCourseQuizContext({
    title: courseRow.title,
    description: courseRow.description,
    structure,
  });

  try {
    const quiz = await generateQuizQuestions({
      numberOfQuestions: input.numberOfQuestions ?? 5,
      courseTitle: courseRow.title,
      courseContent,
    });

    return {
      ok: true,
      quiz,
    };
  } catch (error) {
    console.error("Error generating quiz questions:", error);

    return {
      ok: false,
      code: "UNKNOWN",
      message: "Unable to generate quiz questions right now.",
    };
  }
}
