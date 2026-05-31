"use client";

import { assignCourseToOrganizationMembers } from "@/app/actions/organization-assignments";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AssignmentPanelProps } from "./definitions";

export default function AssignmentPanel({
  organizationId,
  courses,
  members,
  assignments,
}: AssignmentPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedCourseId, setSelectedCourseId] = useState(
    courses[0]?.id ?? "",
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedMemberSet = useMemo(
    () => new Set(selectedMemberIds),
    [selectedMemberIds],
  );

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }

      return [...current, userId];
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <header>
        <h2 className="text-xl font-semibold text-foreground">Assignments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign a course to selected organization members.
        </p>
      </header>

      <form
        className="space-y-4 rounded-xl border border-border bg-background p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setNotice(null);

          startTransition(async () => {
            const result = await assignCourseToOrganizationMembers({
              organizationId,
              courseId: selectedCourseId,
              memberUserIds: selectedMemberIds,
            });

            if (!result.ok) {
              setNotice(result.message ?? "Unable to assign course.");
              return;
            }

            setSelectedMemberIds([]);
            setNotice("Course assigned successfully.");
            router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
          Course
          <select
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-1"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title} ({course.status})
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-foreground">
            Members
          </legend>
          <div className="max-h-52 space-y-2 overflow-auto rounded-lg border border-border bg-surface p-3">
            {members.map((member) => (
              <label
                key={member.userId}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  checked={selectedMemberSet.has(member.userId)}
                  onChange={() => toggleMember(member.userId)}
                  className="h-4 w-4 rounded border-border"
                />
                <span>
                  {member.name} ({member.role})
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={
            isPending || !selectedCourseId || selectedMemberIds.length === 0
          }
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Assign course
        </button>
      </form>

      {notice ? (
        <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
          {notice}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Assigned at</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <tr
                  key={`${assignment.userId}-${assignment.courseId}`}
                  className="border-b border-border/70 last:border-b-0"
                >
                  <td className="px-4 py-3 text-sm text-foreground">
                    {assignment.memberName}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {assignment.courseTitle}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(assignment.createdAtIso).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-6 text-center text-sm text-muted-foreground"
                >
                  No assignments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
