import { fetchCourseBySlug } from "@/app/actions/courses";
import { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";

import Workspace from "@/components/storyboard/workspace/Workspace";

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
  };
};

type SeededCourseRecord = {
  id: string;
  title: string;
  slug: string;
  description: string;
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
    courseEvaluation: structure.courseEvaluation,
    modules: Array.isArray(structure.modules) ? structure.modules : [],
  };
}

export default async function StoryboardPage({ params }: StoryboardPageProps) {
  const { courseId } = await params;
  const course = (await fetchCourseBySlug(courseId)) as SeededCourseRecord;

  return (
    <Workspace
      initialCourse={toApiCoursePayload(course)}
      courseRecordId={course.id}
    />
  );
}
