import Link from "next/link";

import { fetchSeededCourses } from "@/app/actions/courses";
import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";

import NewCourseButton from "@/components/admin/new-course/New-course-button";
import CourseSummaryCard from "@/components/course-summary-card/Course-summary-card";
import { DashboardCourse } from "@/components/course-summary-card/definitions";
import { CourseStatus } from "@/shared/types/storyboard";
import { redirect } from "next/navigation";

type SortOption = "updatedAt_desc" | "createdAt_desc" | "title_asc";
type SearchParams = Record<string, string | string[] | undefined>;
type DashboardPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type SeededCourseStructure = {
  courseId?: string;
  modules?: unknown[];
  metadata?: {
    synopsis?: string;
    audience?: string;
    estimatedDuration?: string;
  };
};

type SeededCourseRecord = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: CourseStatus;
  version: number;
  createdById: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  structure: SeededCourseStructure | null;
};

const PAGE_SIZE_OPTIONS = [6, 9, 12] as const;
const STATUS_OPTIONS: CourseStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "updatedAt_desc", label: "Recently updated" },
  { value: "createdAt_desc", label: "Recently created" },
  { value: "title_asc", label: "Title A-Z" },
];

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function getPageSize(value: string | undefined) {
  const parsed = parsePositiveInt(value, PAGE_SIZE_OPTIONS[0]);

  return PAGE_SIZE_OPTIONS.includes(
    parsed as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? parsed
    : PAGE_SIZE_OPTIONS[0];
}

function getStatus(value: string | undefined) {
  return STATUS_OPTIONS.includes(value as CourseStatus)
    ? (value as CourseStatus)
    : "";
}

function getSort(value: string | undefined): SortOption {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as SortOption)
    : "updatedAt_desc";
}

function getCreatedByMe(value: string | undefined) {
  return value === "1";
}

function EmptyState() {
  return (
    <section className="rounded-4xl border border-dashed border-border bg-background/80 p-10 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">
        No matching courses
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-surface-foreground">
        Try a wider filter or open a different storyboard
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
        No database course matches your current filters. Try a different query
        or reset filters.
      </p>
      <Link
        href="/admin/dashboard"
        className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Reset filters
      </Link>
    </section>
  );
}

function toIsoString(value: Date | string) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function mapSeededCourseToDashboardCourse(
  course: SeededCourseRecord,
): DashboardCourse {
  const structure = course.structure ?? {};
  const metadata = structure.metadata ?? {};

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    status: course.status,
    version: course.version,
    createdAt: toIsoString(course.createdAt),
    updatedAt: toIsoString(course.updatedAt),
    enrolledCount: 0,
    coverAccent: "from-brand-200/55 via-brand-100/35 to-surface",
    synopsis: metadata.synopsis ?? course.description,
    audience: metadata.audience ?? "",
    estimatedDuration: metadata.estimatedDuration ?? "",
    modules: Array.isArray(structure.modules) ? structure.modules : [],
  };
}

export default async function Dashboard({ searchParams }: DashboardPageProps) {
  const session = await getSessionSafely();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const dashboardPath = getDashboardPathForRole(session.user.role);
  if (dashboardPath !== "/admin/dashboard") {
    redirect(dashboardPath);
  }

  const resolvedSearchParams = ((await searchParams) ?? {}) as SearchParams;
  getPageSize(getStringParam(resolvedSearchParams.pageSize));
  const query = getStringParam(resolvedSearchParams.q)?.trim() ?? "";
  const queryLower = query.toLowerCase();
  const status = getStatus(getStringParam(resolvedSearchParams.status));
  const sort = getSort(getStringParam(resolvedSearchParams.sort));
  const createdByMe = getCreatedByMe(
    getStringParam(resolvedSearchParams.createdByMe),
  );

  const allCourses = (await fetchSeededCourses()) as
    | SeededCourseRecord[]
    | undefined;

  if (!allCourses) {
    return <EmptyState />;
  }

  const dashboardCourses = allCourses.map(mapSeededCourseToDashboardCourse);
  const createdByIdByCourseId = new Map(
    allCourses.map((course) => [course.id, course.createdById]),
  );

  const filteredCourses = dashboardCourses
    .filter((course) => {
      const matchesQuery =
        queryLower.length === 0 ||
        course.title.toLowerCase().includes(queryLower);
      const matchesStatus = status.length === 0 || course.status === status;
      const createdById = createdByIdByCourseId.get(course.id);
      const matchesCreator =
        !createdByMe ||
        (Boolean(session.user.id) && createdById === session.user.id);

      return matchesQuery && matchesStatus && matchesCreator;
    })
    .sort((left, right) => {
      switch (sort) {
        case "createdAt_desc":
          return (
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime()
          );
        case "title_asc":
          return left.title.localeCompare(right.title);
        case "updatedAt_desc":
        default:
          return (
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime()
          );
      }
    });

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <NewCourseButton />

        <form
          className="rounded-3xl border border-border bg-surface p-4"
          method="get"
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Search title
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search courses by title"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Status
              <select
                name="status"
                defaultValue={status}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand-500"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
              Sort
              <select
                name="sort"
                defaultValue={sort}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex items-center gap-2 pb-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name="createdByMe"
                value="1"
                defaultChecked={createdByMe}
                className="h-4 w-4 rounded border-border"
              />
              Created by me
            </label>

            <div className="flex items-center gap-2 pb-1">
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Apply
              </button>
              <Link
                href="/admin/dashboard"
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted"
              >
                Reset
              </Link>
            </div>
          </div>
        </form>

        {filteredCourses.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
            {filteredCourses.map((course) => (
              <CourseSummaryCard key={course.id} course={course} />
            ))}
          </section>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}
