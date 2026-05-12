"use client";

import type { RunnerSidebarProps } from "@/components/course-runner/definitions";

export default function RunnerSidebar({
  course,
  lessons,
  selectedLessonId,
  selectedModuleEvalId,
  courseEvalSelected,
  unlockedLessonIds,
  completedLessonIds,
  unlockedModuleEvalIds,
  passedModuleEvalIds,
  courseEvalUnlocked,
  courseEvalPassed,
  progressPercent,
  onSelectLesson,
  onSelectModuleEval,
  onSelectCourseEval,
}: RunnerSidebarProps) {
  return (
    <aside className="sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto bg-surface p-4 shadow-sm">
      <header className="space-y-2 border-b border-border pb-4">
        <h2 className="text-lg font-semibold leading-6 text-foreground">
          {course.title}
        </h2>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Progress
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {progressPercent}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      <div className="mt-4 space-y-3">
        {course.modules.map((moduleItem) => {
          const moduleLessons = lessons.filter(
            (entry) => entry.moduleId === moduleItem.id,
          );
          const hasEval = Boolean(moduleItem.evaluation);
          const evalUnlocked = unlockedModuleEvalIds.has(moduleItem.id);
          const evalPassed = passedModuleEvalIds.has(moduleItem.id);
          const evalSelected = selectedModuleEvalId === moduleItem.id;

          return (
            <section key={moduleItem.id} className="space-y-1">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {moduleItem.title}
              </h3>

              <ul className="space-y-1">
                {moduleLessons.map((entry) => {
                  const isUnlocked = unlockedLessonIds.has(entry.lesson.id);
                  const isCompleted = completedLessonIds.has(entry.lesson.id);
                  const isSelected = selectedLessonId === entry.lesson.id;

                  return (
                    <li key={entry.lesson.id}>
                      <button
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => onSelectLesson(entry.lesson.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/40 text-foreground"
                        } ${!isUnlocked ? "cursor-not-allowed opacity-40" : "hover:bg-muted"}`}
                      >
                        <span>{entry.lesson.title}</span>
                        <span className="shrink-0 text-xs font-semibold">
                          {isCompleted ? "✓" : isUnlocked ? "Open" : "🔒"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {hasEval ? (
                <button
                  type="button"
                  disabled={!evalUnlocked}
                  onClick={() => onSelectModuleEval(moduleItem.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                    evalSelected
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-muted/20 text-foreground"
                  } ${!evalUnlocked ? "cursor-not-allowed opacity-40" : "hover:bg-muted"}`}
                >
                  <span className="italic">
                    {moduleItem.evaluation?.title ?? "Module Evaluation"}
                  </span>
                  <span className="shrink-0 text-xs font-semibold">
                    {evalPassed ? "✓" : evalUnlocked ? "Open" : "🔒"}
                  </span>
                </button>
              ) : null}
            </section>
          );
        })}

        {course.courseEvaluation ? (
          <section className="border-t border-border pt-3">
            <button
              type="button"
              disabled={!courseEvalUnlocked}
              onClick={onSelectCourseEval}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                courseEvalSelected
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-muted/20 text-foreground"
              } ${!courseEvalUnlocked ? "cursor-not-allowed opacity-40" : "hover:bg-muted"}`}
            >
              <span className="italic">
                {course.courseEvaluation.title ?? "Course Evaluation"}
              </span>
              <span className="shrink-0 text-xs font-semibold">
                {courseEvalPassed ? "✓" : courseEvalUnlocked ? "Open" : "🔒"}
              </span>
            </button>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
