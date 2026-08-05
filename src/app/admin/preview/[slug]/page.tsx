import { fetchCourseBySlug } from "@/app/actions/courses";
import { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";
import CourseRunner from "@/components/course-runner/Course-runner";
import { redirect } from "next/navigation";

type AdminPreviewPageProps = {
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

export default async function AdminPreviewPage({
  params,
}: AdminPreviewPageProps) {
  const session = await getSessionSafely();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const dashboardPath = getDashboardPathForRole(session.user.role);
  if (dashboardPath !== "/admin/dashboard") {
    redirect(dashboardPath);
  }

  const { slug } = await params;
  const course = (await fetchCourseBySlug(slug)) as CourseRecord | undefined;

  if (!course) {
    redirect("/admin/dashboard");
  }

  return (
    <CourseRunner
      enrollmentId="preview"
      courseRecordId={course.id}
      course={toApiCoursePayload(course)}
      completedLessonIds={[]}
      passedModuleEvalIds={[]}
      courseEvalPassed={false}
      previewMode
    />
  );
}
