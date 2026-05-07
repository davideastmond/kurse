"use client";

import { completeLessonProgress } from "@/app/actions/course-runner";
import type {
  CourseRunnerProps,
  RunnerLessonRef,
} from "@/components/course-runner/definitions";
import LessonStage from "@/components/course-runner/Lesson-stage";
import RunnerSidebar from "@/components/course-runner/Runner-sidebar";
import { useMemo, useState, useTransition } from "react";

function deriveUnlockedLessons(
  orderedLessons: RunnerLessonRef[],
  completedLessonIds: Set<string>,
) {
  if (orderedLessons.length === 0) {
    return new Set<string>();
  }

  const unlocked = new Set<string>();

  for (const entry of orderedLessons) {
    unlocked.add(entry.lesson.id);

    if (!completedLessonIds.has(entry.lesson.id)) {
      break;
    }
  }

  return unlocked;
}

function getLaunchLessonId(
  lessons: RunnerLessonRef[],
  completedLessonIds: Set<string>,
): string | null {
  if (lessons.length === 0) {
    return null;
  }

  const firstIncomplete = lessons.find(
    (entry) => !completedLessonIds.has(entry.lesson.id),
  );

  return firstIncomplete?.lesson.id ?? lessons[0].lesson.id;
}

export default function CourseRunner({
  enrollmentId,
  course,
  completedLessonIds,
}: CourseRunnerProps) {
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"overview" | "lesson">("overview");
  const [completedSet, setCompletedSet] = useState<Set<string>>(
    new Set(completedLessonIds),
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [inlineQuizGateByBlockId, setInlineQuizGateByBlockId] = useState<
    Record<string, boolean>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const lessonRefs = useMemo(() => {
    const flattened: RunnerLessonRef[] = [];

    course.modules.forEach((moduleItem) => {
      moduleItem.lessons.forEach((lesson) => {
        flattened.push({
          moduleId: moduleItem.id,
          moduleTitle: moduleItem.title,
          lesson,
          index: flattened.length,
        });
      });
    });

    return flattened;
  }, [course.modules]);

  const selectedLessonRef = useMemo(() => {
    if (!selectedLessonId) {
      return null;
    }

    return (
      lessonRefs.find((entry) => entry.lesson.id === selectedLessonId) ?? null
    );
  }, [lessonRefs, selectedLessonId]);

  const unlockedLessonIds = useMemo(() => {
    return deriveUnlockedLessons(lessonRefs, completedSet);
  }, [completedSet, lessonRefs]);

  const launchLessonId = useMemo(() => {
    return getLaunchLessonId(lessonRefs, completedSet);
  }, [completedSet, lessonRefs]);

  const startButtonLabel = useMemo(() => {
    if (lessonRefs.length === 0) {
      return "View";
    }

    if (completedSet.size === lessonRefs.length) {
      return "Review";
    }

    if (completedSet.size > 0) {
      return "Continue";
    }

    return "Begin";
  }, [completedSet.size, lessonRefs.length]);

  const currentLessonHasInlineQuizGates = useMemo(() => {
    const lesson = selectedLessonRef?.lesson;

    if (!lesson) {
      return false;
    }

    return lesson.blocks.some((block) => block.type === "quiz_inline");
  }, [selectedLessonRef?.lesson]);

  const allInlineQuizGatesPassed = useMemo(() => {
    const lesson = selectedLessonRef?.lesson;

    if (!lesson) {
      return true;
    }

    const quizBlocks = lesson.blocks.filter(
      (block) => block.type === "quiz_inline",
    );

    if (quizBlocks.length === 0) {
      return true;
    }

    return quizBlocks.every(
      (block) => inlineQuizGateByBlockId[block.id] === true,
    );
  }, [inlineQuizGateByBlockId, selectedLessonRef?.lesson]);

  const nextLessonRef = useMemo(() => {
    if (!selectedLessonRef) {
      return null;
    }

    return lessonRefs[selectedLessonRef.index + 1] ?? null;
  }, [lessonRefs, selectedLessonRef]);

  const previousLessonRef = useMemo(() => {
    if (!selectedLessonRef) {
      return null;
    }

    return lessonRefs[selectedLessonRef.index - 1] ?? null;
  }, [lessonRefs, selectedLessonRef]);

  const canGoNext =
    (!currentLessonHasInlineQuizGates || allInlineQuizGatesPassed) &&
    !isPending;

  const canGoPrevious = !!previousLessonRef && !isPending;

  const progressPercent =
    lessonRefs.length === 0
      ? 0
      : Math.round((completedSet.size / lessonRefs.length) * 100);

  const selectedModule = useMemo(() => {
    if (!selectedLessonRef) {
      return null;
    }

    return (
      course.modules.find(
        (moduleItem) => moduleItem.id === selectedLessonRef.moduleId,
      ) ?? null
    );
  }, [course.modules, selectedLessonRef]);

  const nextLabel = nextLessonRef ? "Next" : "Mark Complete";

  return (
    <div className="grid min-h-[calc(100vh-6rem)] grid-cols-1 gap-5 p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <RunnerSidebar
        course={course}
        lessons={lessonRefs}
        selectedLessonId={selectedLessonId}
        unlockedLessonIds={unlockedLessonIds}
        completedLessonIds={completedSet}
        onSelectLesson={(lessonId) => {
          if (!unlockedLessonIds.has(lessonId)) {
            return;
          }

          setView("lesson");
          setSelectedLessonId(lessonId);
          setInlineQuizGateByBlockId({});
        }}
      />

      <main className="space-y-4 rounded-3xl border border-border bg-muted/20 p-4 sm:p-6">
        <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {course.title}
            </h1>
            <span className="text-sm font-semibold text-muted-foreground">
              {progressPercent}% complete
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {view === "overview" ? (
          <section className="space-y-4 rounded-3xl border border-border bg-surface p-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Welcome to {course.title}
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              {course.synopsis}
            </p>
            {course.estimatedDuration ? (
              <p className="text-sm font-medium text-foreground">
                Estimated duration: {course.estimatedDuration}
              </p>
            ) : null}
            <button
              type="button"
              disabled={!launchLessonId}
              onClick={() => {
                if (!launchLessonId) {
                  return;
                }

                setSelectedLessonId(launchLessonId);
                setInlineQuizGateByBlockId({});
                setView("lesson");
              }}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {startButtonLabel}
            </button>
          </section>
        ) : null}

        {view === "lesson" && selectedLessonRef && selectedModule ? (
          <LessonStage
            module={selectedModule}
            lesson={selectedLessonRef.lesson}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
            nextLabel={nextLabel}
            isSavingProgress={isPending}
            onPrevious={() => {
              if (!previousLessonRef) {
                return;
              }

              setSelectedLessonId(previousLessonRef.lesson.id);
              setInlineQuizGateByBlockId({});
            }}
            onNext={() => {
              if (!selectedLessonRef || !canGoNext) {
                return;
              }

              setErrorMessage(null);

              startTransition(async () => {
                const result = await completeLessonProgress({
                  enrollmentId,
                  lessonId: selectedLessonRef.lesson.id,
                  courseSlug: course.slug,
                });

                if (!result.ok) {
                  setErrorMessage(result.message);
                  return;
                }

                setCompletedSet((current) => {
                  const next = new Set(current);
                  next.add(selectedLessonRef.lesson.id);
                  return next;
                });

                if (nextLessonRef) {
                  setSelectedLessonId(nextLessonRef.lesson.id);
                } else {
                  setView("overview");
                }

                setInlineQuizGateByBlockId({});
              });
            }}
            onInlineQuizGateChange={(blockId, passed) => {
              setInlineQuizGateByBlockId((current) => ({
                ...current,
                [blockId]: passed,
              }));
            }}
          />
        ) : null}

        {view === "lesson" && !selectedLessonRef ? (
          <section className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
            This lesson is currently unavailable.
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            {errorMessage}
          </section>
        ) : null}
      </main>
    </div>
  );
}
