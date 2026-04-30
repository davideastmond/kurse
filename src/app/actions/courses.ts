"use server";

import { getDb } from "@/db";
import { courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export async function fetchSeededCourses() {
  const db = getDb();
  return db?.select().from(courses);
}

export async function fetchCourseBySlug(slug: string) {
  const db = getDb();

  const course = await db?.select().from(courses).where(eq(courses.slug, slug));

  return course ? course[0] : notFound();
}
