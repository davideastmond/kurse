import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";

import { getDb } from "../../index";
import { courses, users } from "../../schema";

loadEnvConfig(process.cwd());

function getJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

async function verifyCourseStructureIdTrigger() {
  const db = getDb();

  if (!db) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment before running verify-course-trigger.",
    );
  }

  const suffix = Date.now().toString(36);
  const email = `trigger-check-${suffix}@kurse.dev`;
  const slug = `trigger-check-${suffix}`;

  const [createdUser] = await db
    .insert(users)
    .values({
      email,
      name: "Trigger Check Admin",
      passwordHash: "trigger-check-password-hash",
      role: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: users.id });

  if (!createdUser) {
    throw new Error("Failed to create verification user.");
  }

  const [createdCourse] = await db
    .insert(courses)
    .values({
      title: "Trigger Verification Course",
      slug,
      description: "Verifies DB trigger populates structure.courseId",
      status: "DRAFT",
      createdById: createdUser.id,
      structure: {
        courseId: "",
        modules: [],
        metadata: {
          synopsis: "Verifies DB trigger populates structure.courseId",
          audience: "",
          estimatedDuration: "",
        },
      },
    })
    .returning({
      id: courses.id,
      structure: courses.structure,
    });

  if (!createdCourse) {
    throw new Error("Failed to create verification course.");
  }

  const structure = getJsonObject(createdCourse.structure);
  const structureCourseId = structure.courseId;

  const isValid =
    typeof structureCourseId === "string" &&
    structureCourseId === createdCourse.id;

  // Cleanup is best-effort to keep the database tidy.
  await db.delete(courses).where(eq(courses.id, createdCourse.id));
  await db.delete(users).where(eq(users.id, createdUser.id));

  if (!isValid) {
    throw new Error(
      `Trigger validation failed. Expected structure.courseId=${createdCourse.id}, got ${String(structureCourseId)}.`,
    );
  }

  console.log(
    `Trigger validation passed: structure.courseId matches generated id (${createdCourse.id}).`,
  );
}

verifyCourseStructureIdTrigger().catch((error) => {
  console.error("verify-course-trigger failed:", error);
  process.exitCode = 1;
});
