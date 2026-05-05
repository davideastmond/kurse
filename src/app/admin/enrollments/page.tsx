import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import EnrollmentManager from "@/components/admin/enrollments/Enrollment-manager";
import { getDb } from "@/db";
import { courses, enrollments, users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

type EnrollmentsPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function EnrollmentsPage({
  searchParams,
}: EnrollmentsPageProps) {
  const session = await getSessionSafely();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const dashboardPath = getDashboardPathForRole(session.user.role);
  if (dashboardPath !== "/admin/dashboard") {
    redirect(dashboardPath);
  }

  const db = getDb();
  if (!db) {
    return (
      <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
        <section className="rounded-2xl border border-danger/40 bg-danger/15 p-6 text-danger">
          Database is not configured. Set DATABASE_URL and retry.
        </section>
      </main>
    );
  }

  const courseRows = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      status: courses.status,
    })
    .from(courses)
    .orderBy(courses.title);

  const studentRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.role, "STUDENT"))
    .orderBy(users.name);

  const resolvedSearchParams = ((await searchParams) ?? {}) as SearchParams;
  const requestedCourseId = getStringParam(resolvedSearchParams.courseId);

  const selectedCourse =
    courseRows.find((course) => course.id === requestedCourseId) ??
    courseRows[0] ??
    null;

  const selectedCourseId = selectedCourse?.id ?? null;

  const enrolledRows = selectedCourseId
    ? await db
        .select({
          userId: enrollments.userId,
        })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.courseId, selectedCourseId),
            isNull(enrollments.completedAt),
          ),
        )
    : [];

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
      <EnrollmentManager
        courses={courseRows}
        students={studentRows}
        selectedCourseId={selectedCourseId}
        enrolledStudentIds={enrolledRows.map((row) => row.userId)}
      />
    </main>
  );
}
