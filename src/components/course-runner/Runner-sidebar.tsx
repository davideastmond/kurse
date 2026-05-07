"use client";

import type { RunnerSidebarProps } from "@/components/course-runner/definitions";

export default function RunnerSidebar({
  course,
  lessons,
  selectedLessonId,
  unlockedLessonIds,
  completedLessonIds,
  onSelectLesson,
}: RunnerSidebarProps) {
  return (
    <aside className="sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-border bg-surface p-4 shadow-sm">
      <header className="space-y-2 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Course Runner
        </p>
        <h2 className="text-lg font-semibold leading-6 text-foreground">
          {course.title}
        </h2>
      </header>

      <div className="mt-4 space-y-3">
        {course.modules.map((moduleItem) => {
          const moduleLessons = lessons.filter(
            (entry) => entry.moduleId === moduleItem.id,
          );

          return (
            <section key={moduleItem.id} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
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
                        onClick={() => {
                          onSelectLesson(entry.lesson.id);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/40 text-foreground"
                        } ${!isUnlocked ? "cursor-not-allowed opacity-50" : "hover:bg-muted"}`}
                      >
                        <span>{entry.lesson.title}</span>
                        <span className="text-xs font-semibold">
                          {isCompleted
                            ? "Done"
                            : isUnlocked
                              ? "Open"
                              : "Locked"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                Module evaluation (v1 placeholder)
              </div>
            </section>
          );
        })}

        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Course evaluation (locked until all modules complete)
        </div>
      </div>
    </aside>
  );
}
