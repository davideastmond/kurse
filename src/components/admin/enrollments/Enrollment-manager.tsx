"use client";

import {
  enrollAllStudentsInCourse,
  enrollStudentInCourse,
  removeAllStudentsFromCourse,
  removeStudentFromCourse,
} from "@/app/actions/enrollments";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

type CourseOption = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type StudentOption = {
  id: string;
  name: string;
  email: string;
};

type EnrollmentManagerProps = {
  courses: CourseOption[];
  students: StudentOption[];
  selectedCourseId: string | null;
  enrolledStudentIds: string[];
};

export default function EnrollmentManager({
  courses,
  students,
  selectedCourseId,
  enrolledStudentIds,
}: EnrollmentManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  const enrolledSet = useMemo(
    () => new Set(enrolledStudentIds),
    [enrolledStudentIds],
  );

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  );

  const updateCourseFilter = (courseId: string) => {
    const params = new URLSearchParams();
    if (courseId) {
      params.set("courseId", courseId);
    }

    const query = params.toString();
    router.push(query ? `/admin/enrollments?${query}` : "/admin/enrollments");
  };

  const withAction = (
    action: () => Promise<{ ok: boolean; message?: string }>,
  ) => {
    startTransition(async () => {
      setNotice(null);
      const result = await action();

      if (!result.ok) {
        setNotice(result.message ?? "Action failed.");
        return;
      }

      router.refresh();
    });
  };

  if (courses.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          No courses available
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a course first before assigning students.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Enrollment Manager
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Manage Course Enrollments
            </h1>
          </div>

          <div className="min-w-72">
            <label
              htmlFor="course-picker"
              className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Selected course
            </label>
            <select
              id="course-picker"
              value={selectedCourseId ?? ""}
              onChange={(event) => updateCourseFilter(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-1"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} ({course.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCourse ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                withAction(() =>
                  enrollAllStudentsInCourse({ courseId: selectedCourse.id }),
                );
              }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Enroll all students
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                withAction(() =>
                  removeAllStudentsFromCourse({ courseId: selectedCourse.id }),
                );
              }}
              className="rounded-lg border border-danger/40 bg-danger/15 px-4 py-2 text-sm font-semibold text-danger transition hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove all students
            </button>
          </div>
        ) : null}

        {notice ? (
          <p className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
            {notice}
          </p>
        ) : null}
      </header>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Enrollment</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const isEnrolled = enrolledSet.has(student.id);

              return (
                <tr
                  key={student.id}
                  className="border-b border-border/70 last:border-b-0"
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    {student.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {student.email}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {isEnrolled ? (
                      <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-semibold text-success">
                        Enrolled
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                        Not enrolled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {selectedCourse ? (
                      isEnrolled ? (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            withAction(() =>
                              removeStudentFromCourse({
                                courseId: selectedCourse.id,
                                studentId: student.id,
                              }),
                            );
                          }}
                          className="rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-danger transition hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            withAction(() =>
                              enrollStudentInCourse({
                                courseId: selectedCourse.id,
                                studentId: student.id,
                              }),
                            );
                          }}
                          className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Enroll
                        </button>
                      )
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
