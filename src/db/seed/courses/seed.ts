import { loadEnvConfig } from "@next/env";

import { getDb } from "../../index";
import * as schema from "../../schema";
import { mockCourses } from "./mock-data";

const SEED_ADMIN_ID = "6d8c4e8f-9db2-4ad0-a27e-b2dc98e38510";

loadEnvConfig(process.cwd());

async function seedCourses() {
  const db = getDb();

  if (!db) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment before running seed-courses.",
    );
  }

  console.log("Upserting admin user and courses...");
  await db
    .insert(schema.users)
    .values({
      id: SEED_ADMIN_ID,
      email: "admin@kurse.dev",
      name: "Kurse Admin",
      passwordHash: "seeded-admin-password-hash",
      role: "ADMIN",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        name: "Kurse Admin",
        role: "ADMIN",
        updatedAt: new Date(),
      },
    });

  for (const course of mockCourses) {
    const structure = {
      courseId: course.id,
      version: course.version,
      title: course.title,
      modules: course.modules,
      metadata: {
        synopsis: course.synopsis,
        audience: course.audience,
        estimatedDuration: course.estimatedDuration,
      },
    };

    await db
      .insert(schema.courses)
      .values({
        title: course.title,
        slug: course.slug,
        description: course.synopsis,
        coverImageUrl: null,
        structure,
        version: course.version,
        status: course.status,
        createdById: SEED_ADMIN_ID,
        createdAt: new Date(course.createdAt),
        updatedAt: new Date(course.updatedAt),
      })
      .onConflictDoUpdate({
        target: schema.courses.slug,
        set: {
          title: course.title,
          description: course.synopsis,
          coverImageUrl: null,
          structure,
          version: course.version,
          status: course.status,
          createdById: SEED_ADMIN_ID,
          createdAt: new Date(course.createdAt),
          updatedAt: new Date(course.updatedAt),
        },
      });
  }

  console.log("Course seeding complete.");
}

seedCourses()
  .then(() => {
    console.log("Seed finished successfully.");
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  });
