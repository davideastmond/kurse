import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import { getDb } from "@/db";
import { courses, enrollments } from "@/db/schema";
import { and, count, desc, eq, ilike, isNull } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

type UserDashboardPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

const PAGE_SIZE = 9;

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export default async function UserDashboardPage({
  searchParams,
}: UserDashboardPageProps) {
  const session = await getSessionSafely();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const dashboardPath = getDashboardPathForRole(session.user.role);
  if (dashboardPath !== "/user/dashboard") {
    redirect(dashboardPath);
  }

  const resolvedSearchParams = ((await searchParams) ?? {}) as SearchParams;
  const query = getStringParam(resolvedSearchParams.q)?.trim() ?? "";
  const page = getPositiveInt(getStringParam(resolvedSearchParams.page), 1);

  const db = getDb();
  if (!db) {
    return (
      <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
        <section className="rounded-3xl border border-danger/40 bg-danger/15 p-6 text-danger">
          Database is not configured. Set DATABASE_URL and retry.
        </section>
      </main>
    );
  }

  const filters = [
    eq(enrollments.userId, session.user.id),
    isNull(enrollments.completedAt),
  ];

  if (query.length > 0) {
    filters.push(ilike(courses.title, `%${query}%`));
  }

  const [countRow] = await db
    .select({ total: count() })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(and(...filters));

  const totalCourses = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCourses / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const enrolledCourses = await db
    .select({
      id: courses.id,
      slug: courses.slug,
      title: courses.title,
      description: courses.description,
      updatedAt: courses.updatedAt,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(and(...filters))
    .orderBy(desc(courses.updatedAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const hasResults = enrolledCourses.length > 0;

  const previousPageHref =
    currentPage > 1
      ? `/user/dashboard?${new URLSearchParams({
          q: query,
          page: String(currentPage - 1),
        }).toString()}`
      : null;

  const nextPageHref =
    currentPage < totalPages
      ? `/user/dashboard?${new URLSearchParams({
          q: query,
          page: String(currentPage + 1),
        }).toString()}`
      : null;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-10">
      <header className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Your Courses
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue learning from your active enrollments.
          </p>
        </div>

        <form action="/user/dashboard" className="max-w-xl">
          <label
            htmlFor="course-search"
            className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            Search courses
          </label>
          <div className="flex items-center gap-2">
            <input
              id="course-search"
              name="q"
              defaultValue={query}
              placeholder="Search by title"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Search
            </button>
          </div>
        </form>
      </header>

      {hasResults ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrolledCourses.map((course) => (
            <Link
              key={course.id}
              href={`/user/learn/${course.slug}`}
              className="rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/40 hover:bg-muted/40"
            >
              <h2 className="text-lg font-semibold text-foreground">
                {course.title}
              </h2>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {course.description}
              </p>
            </Link>
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            No active courses
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different search or ask an admin to enroll you in a course.
          </p>
        </section>
      )}

      <footer className="mt-6 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          {previousPageHref ? (
            <Link
              href={previousPageHref}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
            >
              Previous
            </Link>
          ) : null}

          {nextPageHref ? (
            <Link
              href={nextPageHref}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
            >
              Next
            </Link>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
