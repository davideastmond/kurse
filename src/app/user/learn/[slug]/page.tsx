import { fetchCourseBySlug } from "@/app/actions/courses";
import { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import CourseRunner from "@/components/course-runner/Course-runner";
import { getDb } from "@/db";
import {
  enrollments,
  evaluationAttempts,
  evaluations,
  lessonProgress,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

type LearningStagePageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

type SeededCourseStructure = {
  courseId?: string;
  courseEvaluation?: ApiCoursePayload["courseEvaluation"];
  modules?: ApiCoursePayload["modules"];
  metadata?: {
    synopsis?: string;
    audience?: string;
    estimatedDuration?: string;
    welcomeImages?: ApiCoursePayload["welcomeImages"];
  };
};

type CourseRecord = {
  id: string;
  title: string;
  slug: string;
  description: string;
  version: number;
  status: ApiCoursePayload["status"];
  structure: SeededCourseStructure | null;
};

function toApiCoursePayload(row: CourseRecord): ApiCoursePayload {
  const structure = row.structure ?? {};

  return {
    id: structure.courseId ?? row.slug,
    title: row.title,
    slug: row.slug,
    status: row.status,
    version: row.version,
    synopsis: structure.metadata?.synopsis ?? row.description,
    audience: structure.metadata?.audience ?? "",
    estimatedDuration: structure.metadata?.estimatedDuration ?? "",
    welcomeImages: structure.metadata?.welcomeImages ?? [],
    courseEvaluation: structure.courseEvaluation,
    modules: Array.isArray(structure.modules) ? structure.modules : [],
  };
}

export default async function LearningStagePage({
  params,
}: LearningStagePageProps) {
  const session = await getSessionSafely();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const dashboardPath = getDashboardPathForRole(session.user.role);
  if (dashboardPath !== "/user/dashboard") {
    redirect(dashboardPath);
  }

  const { slug } = await params;
  const course = (await fetchCourseBySlug(slug)) as CourseRecord;
  const coursePayload = toApiCoursePayload(course);

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

  const [enrollment] = await db
    .select({
      id: enrollments.id,
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.courseId, course.id),
        eq(enrollments.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!enrollment) {
    notFound();
  }

  const progressRows = await db
    .select({
      lessonId: lessonProgress.lessonId,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.enrollmentId, enrollment.id));

  const completedLessonIds = progressRows.map((row) => row.lessonId);

  const passedAttemptRows = await db
    .select({
      scope: evaluations.scope,
      moduleId: evaluations.moduleId,
    })
    .from(evaluationAttempts)
    .innerJoin(evaluations, eq(evaluations.id, evaluationAttempts.evaluationId))
    .where(
      and(
        eq(evaluationAttempts.enrollmentId, enrollment.id),
        eq(evaluationAttempts.passed, true),
      ),
    );

  const passedModuleEvalIds = passedAttemptRows
    .filter((r) => r.scope === "MODULE" && r.moduleId)
    .map((r) => r.moduleId!);

  const courseEvalPassed = passedAttemptRows.some((r) => r.scope === "COURSE");

  return (
    <CourseRunner
      enrollmentId={enrollment.id}
      courseRecordId={course.id}
      course={coursePayload}
      completedLessonIds={completedLessonIds}
      passedModuleEvalIds={passedModuleEvalIds}
      courseEvalPassed={courseEvalPassed}
    />
  );
}
