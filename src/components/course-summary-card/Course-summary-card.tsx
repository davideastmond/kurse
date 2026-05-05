import Link from "next/link";

import { type CourseStatus } from "@/shared/types/storyboard";
import { DashboardCourse } from "./definitions";

type StatusClasses = Record<CourseStatus, string>;

const STATUS_CLASSES: StatusClasses = {
  PUBLISHED: "bg-success/15 text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
  DRAFT: "bg-warning/15 text-warning",
};

type CourseSummaryCardProps = {
  course: DashboardCourse;
};

export default function CourseSummaryCard({ course }: CourseSummaryCardProps) {
  return (
    <Link
      href={`/admin/storyboard/${course.slug}`}
      className={`group rounded-4xl border border-border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
            {course.title}
          </h2>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.16em] ${STATUS_CLASSES[course.status]}`}
        >
          {course.status}
        </span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        {course.synopsis}
      </p>
      <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
        <span>modules count TBI</span>
        <span>{course.estimatedDuration}</span>
        <span>{course.enrolledCount} learners</span>
      </div>
      <p className="mt-8 text-sm font-semibold text-brand-800 transition group-hover:translate-x-1">
        Open storyboard
      </p>
    </Link>
  );
}
