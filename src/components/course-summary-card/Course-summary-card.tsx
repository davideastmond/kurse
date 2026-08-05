"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";

import { type CourseStatus } from "@/shared/types/storyboard";
import { CourseSummaryCardProps } from "./definitions";

type StatusClasses = Record<CourseStatus, string>;

const STATUS_CLASSES: StatusClasses = {
  PUBLISHED: "bg-success/15 text-success",
  ARCHIVED: "bg-muted text-muted-foreground",
  DRAFT: "bg-warning/15 text-warning",
};

function shouldShowLoading(event: MouseEvent<HTMLAnchorElement>) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    event.shiftKey
  );
}

export default function CourseSummaryCard({
  course,
  href = `/admin/storyboard/${course.slug}`,
  synopsis = course.synopsis,
}: CourseSummaryCardProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [pathname]);

  return (
    <Link
      href={href}
      className="group relative border border-border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      aria-busy={isLoading}
      onClick={(event) => {
        if (shouldShowLoading(event)) {
          setIsLoading(true);
        }
      }}
    >
      {isLoading ? (
        <span className="absolute inset-0 z-10 flex items-center justify-center bg-surface/75 backdrop-blur-[1px]">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
            <span
              className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
              aria-hidden="true"
            />
            Loading
          </span>
        </span>
      ) : null}

      <div className={isLoading ? "opacity-40" : undefined}>
        <div className="flex ">
          <span
            className={`inline-flex w-full px-3 py-1 text-[11px] font-semibold tracking-[0.16em] ${STATUS_CLASSES[course.status]}`}
          >
            {course.status}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              {course.title}
            </h2>
          </div>
        </div>

        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {synopsis}
        </p>

        <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
          <span>modules count TBI</span>
          <span>{course.estimatedDuration}</span>
          <span>{course.enrolledCount} learners</span>
        </div>
      </div>
    </Link>
  );
}
