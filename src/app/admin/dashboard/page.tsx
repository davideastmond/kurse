import Link from "next/link";

import { fetchSeededCourses } from "@/app/actions/courses";
import { type MockCourse } from "@/app/admin/mock-course-data";
import StoryboardSummaryCard from "@/components/storyboard-summary-card/Storyboard-summary-card";
import { CourseStatus } from "@/shared/types/storyboard";

type SortOption = "updatedAt_desc" | "createdAt_desc" | "title_asc";
type SearchParams = Record<string, string | string[] | undefined>;
type DashboardPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type SeededCourseStructure = {
  courseId?: string;
  modules?: MockCourse["modules"];
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
): MockCourse {
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
    completionRate: 0,
    averageScore: 0,
    coverAccent: "from-sky-200 via-cyan-50 to-white",
    synopsis: metadata.synopsis ?? course.description,
    audience: metadata.audience ?? "",
    estimatedDuration: metadata.estimatedDuration ?? "",
    modules: Array.isArray(structure.modules) ? structure.modules : [],
  };
}

export default async function Dashboard({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = ((await searchParams) ?? {}) as SearchParams;
  getPageSize(getStringParam(resolvedSearchParams.pageSize));
  const query =
    getStringParam(resolvedSearchParams.q)?.trim().toLowerCase() ?? "";
  const status = getStatus(getStringParam(resolvedSearchParams.status));
  const sort = getSort(getStringParam(resolvedSearchParams.sort));

  const allCourses = (await fetchSeededCourses()) as
    | SeededCourseRecord[]
    | undefined;

  if (!allCourses) {
    return <EmptyState />;
  }

  const dashboardCourses = allCourses.map(mapSeededCourseToDashboardCourse);

  const filteredCourses = dashboardCourses
    .filter((course) => {
      const matchesQuery =
        query.length === 0 ||
        course.title.toLowerCase().includes(query) ||
        course.slug.toLowerCase().includes(query) ||
        course.audience.toLowerCase().includes(query);
      const matchesStatus = status.length === 0 || course.status === status;

      return matchesQuery && matchesStatus;
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(21,94,239,0.12),transparent_40%),linear-gradient(180deg,var(--background),#eef4ff)] px-6 py-10 text-foreground md:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        {filteredCourses.length > 0 ? (
          <section className="grid gap-4 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))]">
            {filteredCourses.map((course) => (
              <StoryboardSummaryCard key={course.id} course={course} />
            ))}
          </section>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}
