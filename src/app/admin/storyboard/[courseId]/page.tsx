import { fetchCourseBySlug } from "@/app/actions/courses";
import { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { getDashboardPathForRole } from "@/auth/dashboard";
import { getSessionSafely } from "@/auth/session";

import Workspace from "@/components/storyboard/workspace/Workspace";
import { redirect } from "next/navigation";

type StoryboardPageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
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

type SeededCourseRecord = {
  id: string;
  title: string;
  slug: string;
  description: string;
  createdById: string;
  version: number;
  status: ApiCoursePayload["status"];
  structure: SeededCourseStructure | null;
};

function toApiCoursePayload(row: SeededCourseRecord): ApiCoursePayload {
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

export default async function StoryboardPage({ params }: StoryboardPageProps) {
  const session = await getSessionSafely();
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const dashboardPath = getDashboardPathForRole(session.user.role);
  if (dashboardPath !== "/admin/dashboard") {
    redirect(dashboardPath);
  }

  const { courseId } = await params;
  const course = (await fetchCourseBySlug(courseId)) as SeededCourseRecord;
  const isReadOnly = !session.user.id || course.createdById !== session.user.id;

  return (
    <Workspace
      initialCourse={toApiCoursePayload(course)}
      courseRecordId={course.id}
      readOnly={isReadOnly}
    />
  );
}
