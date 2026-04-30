import Link from "next/link";

import { type CourseStatus } from "@/shared/types/storyboard";

export type DashboardCourse = {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  synopsis: string;
  estimatedDuration: string;
  enrolledCount: number;
  coverAccent: string;
  audience: string;
  createdAt: string;
  updatedAt: string;
  modules: unknown[];
  version: number;
};

type StatusClasses = Record<CourseStatus, string>;

const STATUS_CLASSES: StatusClasses = {
  PUBLISHED: "bg-emerald-50 text-emerald-800",
  ARCHIVED: "bg-slate-100 text-slate-700",
  DRAFT: "bg-amber-50 text-amber-800",
};

type StoryboardSummaryCardProps = {
  course: DashboardCourse;
};

export default function StoryboardSummaryCard({
  course,
}: StoryboardSummaryCardProps) {
  return (
    <Link
      href={`/admin/storyboard/${course.slug}`}
      className={`group rounded-4xl border border-border bg-linear-to-br ${course.coverAccent} p-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-800/75">
            Featured storyboard
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {course.title}
          </h2>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.16em] ${STATUS_CLASSES[course.status]}`}
        >
          {course.status}
        </span>
      </div>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-700">
        {course.synopsis}
      </p>
      <div className="mt-6 flex flex-wrap gap-5 text-sm text-slate-700">
        <span>{course.modules.length} modules</span>
        <span>{course.estimatedDuration}</span>
        <span>{course.enrolledCount} learners</span>
      </div>
      <p className="mt-8 text-sm font-semibold text-brand-800 transition group-hover:translate-x-1">
        Open storyboard
      </p>
    </Link>
  );
}
