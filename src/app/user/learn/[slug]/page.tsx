import { fetchCourseBySlug } from "@/app/actions/courses";

type LearningStagePageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

type CourseRecord = {
  title: string;
};

export default async function LearningStagePage({
  params,
}: LearningStagePageProps) {
  const { slug } = await params;
  const course = (await fetchCourseBySlug(slug)) as CourseRecord;

  return (
    <div>
      <h1>{course.title}</h1>
    </div>
  );
}
