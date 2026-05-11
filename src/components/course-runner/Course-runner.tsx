"use client";

import { completeLessonProgress } from "@/app/actions/course-runner";
import type {
  CourseRunnerProps,
  RunnerLessonRef,
} from "@/components/course-runner/definitions";
import EvaluationRunner from "@/components/course-runner/Evaluation-runner";
import LessonStage from "@/components/course-runner/Lesson-stage";
import RunnerSidebar from "@/components/course-runner/Runner-sidebar";
import type { StoryboardModule } from "@/shared/types/storyboard";
import { useMemo, useState, useTransition } from "react";

// ---------------------------------------------------------------------------
// Unlock / progress engine
// ---------------------------------------------------------------------------

type ProgressState = {
  unlockedLessonIds: Set<string>;
  unlockedModuleEvalIds: Set<string>;
  courseEvalUnlocked: boolean;
};

function deriveProgressState(
  modules: StoryboardModule[],
  completedLessonIds: Set<string>,
  passedModuleEvalIds: Set<string>,
): ProgressState {
  const unlockedLessonIds = new Set<string>();
  const unlockedModuleEvalIds = new Set<string>();

  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i]!;
    const prev = i > 0 ? modules[i - 1]! : null;

    // A module is accessible only if the previous module is fully done.
    if (prev) {
      const prevLessonsDone = prev.lessons.every((l) =>
        completedLessonIds.has(l.id),
      );
      const prevEvalPassed =
        !prev.evaluation || passedModuleEvalIds.has(prev.id);
      if (!prevLessonsDone || !prevEvalPassed) {
        break;
      }
    }

    // Unlock lessons sequentially within this module.
    for (const lesson of mod.lessons) {
      unlockedLessonIds.add(lesson.id);
      if (!completedLessonIds.has(lesson.id)) {
        break;
      }
    }

    // Module eval is unlocked once all lessons in this module are done.
    if (
      mod.evaluation &&
      mod.lessons.length > 0 &&
      mod.lessons.every((l) => completedLessonIds.has(l.id))
    ) {
      unlockedModuleEvalIds.add(mod.id);
    }
  }

  const courseEvalUnlocked =
    modules.length > 0 &&
    modules.every((mod) => {
      const lessonsDone = mod.lessons.every((l) =>
        completedLessonIds.has(l.id),
      );
      const evalPassed = !mod.evaluation || passedModuleEvalIds.has(mod.id);
      return lessonsDone && evalPassed;
    });

  return { unlockedLessonIds, unlockedModuleEvalIds, courseEvalUnlocked };
}

// ---------------------------------------------------------------------------
// Navigation target helpers
// ---------------------------------------------------------------------------

type NavTarget =
  | { type: "lesson"; lessonId: string }
  | { type: "module_eval"; moduleId: string }
  | { type: "course_eval" }
  | { type: "overview" };

function getAfterLessonTarget(
  modules: StoryboardModule[],
  moduleId: string,
  lessonId: string,
  hasCourseEval: boolean,
): NavTarget {
  const modIndex = modules.findIndex((m) => m.id === moduleId);
  if (modIndex === -1) return { type: "overview" };

  const mod = modules[modIndex]!;
  const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
  const nextInModule = mod.lessons[lessonIndex + 1] ?? null;

  if (nextInModule) {
    return { type: "lesson", lessonId: nextInModule.id };
  }

  // Last lesson of this module.
  if (mod.evaluation) {
    return { type: "module_eval", moduleId: mod.id };
  }

  // No eval — look for next module's first lesson.
  const nextMod = modules[modIndex + 1] ?? null;
  if (nextMod && nextMod.lessons.length > 0) {
    return { type: "lesson", lessonId: nextMod.lessons[0]!.id };
  }

  if (hasCourseEval) {
    return { type: "course_eval" };
  }

  return { type: "overview" };
}

function getAfterModuleEvalTarget(
  modules: StoryboardModule[],
  moduleId: string,
  hasCourseEval: boolean,
): NavTarget {
  const modIndex = modules.findIndex((m) => m.id === moduleId);
  const nextMod = modIndex >= 0 ? (modules[modIndex + 1] ?? null) : null;

  if (nextMod && nextMod.lessons.length > 0) {
    return { type: "lesson", lessonId: nextMod.lessons[0]!.id };
  }

  if (hasCourseEval) {
    return { type: "course_eval" };
  }

  return { type: "overview" };
}

// ---------------------------------------------------------------------------
// Runner view state
// ---------------------------------------------------------------------------

type RunnerView =
  | { type: "overview" }
  | { type: "lesson"; lessonId: string }
  | { type: "module_eval"; moduleId: string }
  | { type: "course_eval" };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CourseRunner({
  enrollmentId,
  courseRecordId,
  course,
  completedLessonIds,
  passedModuleEvalIds,
  courseEvalPassed: initialCourseEvalPassed,
}: CourseRunnerProps) {
  const [isPending, startTransition] = useTransition();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<RunnerView>({
    type: "overview",
  });
  const [completedSet, setCompletedSet] = useState<Set<string>>(
    new Set(completedLessonIds),
  );
  const [passedModuleEvalSet, setPassedModuleEvalSet] = useState<Set<string>>(
    new Set(passedModuleEvalIds),
  );
  const [courseEvalPassed, setCourseEvalPassed] = useState(
    initialCourseEvalPassed,
  );
  const [inlineQuizGates, setInlineQuizGates] = useState<
    Record<string, boolean>
  >({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Flatten all lessons across modules with stable index.
  const lessonRefs = useMemo<RunnerLessonRef[]>(() => {
    const flat: RunnerLessonRef[] = [];
    course.modules.forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        flat.push({
          moduleId: mod.id,
          moduleTitle: mod.title,
          lesson,
          index: flat.length,
        });
      });
    });
    return flat;
  }, [course.modules]);

  // Unlock / progress derivation.
  const { unlockedLessonIds, unlockedModuleEvalIds, courseEvalUnlocked } =
    useMemo(
      () =>
        deriveProgressState(course.modules, completedSet, passedModuleEvalSet),
      [course.modules, completedSet, passedModuleEvalSet],
    );

  // Current lesson/module context.
  const selectedLessonRef = useMemo(() => {
    if (currentView.type !== "lesson") return null;
    return lessonRefs.find((e) => e.lesson.id === currentView.lessonId) ?? null;
  }, [currentView, lessonRefs]);

  const selectedModule = useMemo<StoryboardModule | null>(() => {
    if (currentView.type === "lesson" && selectedLessonRef) {
      return (
        course.modules.find((m) => m.id === selectedLessonRef.moduleId) ?? null
      );
    }
    if (currentView.type === "module_eval") {
      return course.modules.find((m) => m.id === currentView.moduleId) ?? null;
    }
    return null;
  }, [course.modules, currentView, selectedLessonRef]);

  // Inline quiz gating.
  const currentLessonHasQuizGates = useMemo(() => {
    if (!selectedLessonRef) return false;
    return selectedLessonRef.lesson.blocks.some(
      (b) => b.type === "quiz_inline",
    );
  }, [selectedLessonRef]);

  const allQuizGatesPassed = useMemo(() => {
    if (!selectedLessonRef) return true;
    const quizBlocks = selectedLessonRef.lesson.blocks.filter(
      (b) => b.type === "quiz_inline",
    );
    if (quizBlocks.length === 0) return true;
    return quizBlocks.every((b) => inlineQuizGates[b.id] === true);
  }, [inlineQuizGates, selectedLessonRef]);

  // After-lesson navigation target.
  const afterLessonTarget = useMemo<NavTarget>(() => {
    if (!selectedLessonRef) return { type: "overview" };
    return getAfterLessonTarget(
      course.modules,
      selectedLessonRef.moduleId,
      selectedLessonRef.lesson.id,
      Boolean(course.courseEvaluation),
    );
  }, [course.modules, course.courseEvaluation, selectedLessonRef]);

  const canGoNext =
    currentView.type === "lesson" &&
    (!currentLessonHasQuizGates || allQuizGatesPassed) &&
    !isPending;

  const canGoPreviousLesson =
    currentView.type === "lesson" &&
    selectedLessonRef !== null &&
    selectedLessonRef.index > 0 &&
    !isPending;

  const nextLabel =
    afterLessonTarget.type === "overview" ? "Mark Complete" : "Next";

  // Progress bar (lessons only for now).
  const progressPercent =
    lessonRefs.length === 0
      ? 0
      : Math.round((completedSet.size / lessonRefs.length) * 100);

  // Start button label.
  const startButtonLabel = useMemo(() => {
    if (lessonRefs.length === 0) return "View";
    if (completedSet.size === lessonRefs.length) return "Review";
    if (completedSet.size > 0) return "Continue";
    return "Begin";
  }, [completedSet.size, lessonRefs.length]);

  const launchLessonId = useMemo(() => {
    if (lessonRefs.length === 0) return null;
    const first = lessonRefs.find((e) => !completedSet.has(e.lesson.id));
    return first?.lesson.id ?? lessonRefs[0]!.lesson.id;
  }, [completedSet, lessonRefs]);

  function navigate(target: NavTarget) {
    setInlineQuizGates({});
    setErrorMessage(null);
    setIsSidebarOpen(false);
    if (target.type === "overview") {
      setCurrentView({ type: "overview" });
    } else if (target.type === "lesson") {
      setCurrentView({ type: "lesson", lessonId: target.lessonId });
    } else if (target.type === "module_eval") {
      setCurrentView({ type: "module_eval", moduleId: target.moduleId });
    } else {
      setCurrentView({ type: "course_eval" });
    }
  }

  function handleLessonNext() {
    if (!selectedLessonRef || !canGoNext) return;

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

      setCompletedSet((prev) => {
        const next = new Set(prev);
        next.add(selectedLessonRef.lesson.id);
        return next;
      });

      navigate(afterLessonTarget);
    });
  }

  function handleLessonPrevious() {
    if (!selectedLessonRef || !canGoPreviousLesson) return;
    const prev = lessonRefs[selectedLessonRef.index - 1];
    if (prev) navigate({ type: "lesson", lessonId: prev.lesson.id });
  }

  function handleModuleEvalPass(moduleId: string) {
    setPassedModuleEvalSet((prev) => {
      const next = new Set(prev);
      next.add(moduleId);
      return next;
    });
    navigate(
      getAfterModuleEvalTarget(
        course.modules,
        moduleId,
        Boolean(course.courseEvaluation),
      ),
    );
  }

  function handleCourseEvalPass() {
    setCourseEvalPassed(true);
    navigate({ type: "overview" });
  }

  return (
    <div className="grid min-h-[calc(100vh-6rem)] grid-cols-1 gap-5 p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground shadow-sm"
          aria-label="Open table of contents"
        >
          <span>Table of contents</span>
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            Menu
          </span>
        </button>
      </div>

      <div className="hidden lg:block">
        <RunnerSidebar
          course={course}
          lessons={lessonRefs}
          selectedLessonId={
            currentView.type === "lesson" ? currentView.lessonId : null
          }
          selectedModuleEvalId={
            currentView.type === "module_eval" ? currentView.moduleId : null
          }
          courseEvalSelected={currentView.type === "course_eval"}
          unlockedLessonIds={unlockedLessonIds}
          completedLessonIds={completedSet}
          unlockedModuleEvalIds={unlockedModuleEvalIds}
          passedModuleEvalIds={passedModuleEvalSet}
          courseEvalUnlocked={courseEvalUnlocked}
          courseEvalPassed={courseEvalPassed}
          progressPercent={progressPercent}
          onSelectLesson={(lessonId) => {
            if (!unlockedLessonIds.has(lessonId)) return;
            navigate({ type: "lesson", lessonId });
          }}
          onSelectModuleEval={(moduleId) => {
            if (!unlockedModuleEvalIds.has(moduleId)) return;
            navigate({ type: "module_eval", moduleId });
          }}
          onSelectCourseEval={() => {
            if (!courseEvalUnlocked) return;
            navigate({ type: "course_eval" });
          }}
        />
      </div>

      <div
        className={`fixed inset-0 z-40 lg:hidden ${isSidebarOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0"}`}
          aria-label="Close table of contents"
          onClick={() => setIsSidebarOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 w-[min(88vw,20rem)] bg-surface shadow-2xl transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Table of contents
            </p>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground"
            >
              Close
            </button>
          </div>
          <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
            <RunnerSidebar
              course={course}
              lessons={lessonRefs}
              selectedLessonId={
                currentView.type === "lesson" ? currentView.lessonId : null
              }
              selectedModuleEvalId={
                currentView.type === "module_eval" ? currentView.moduleId : null
              }
              courseEvalSelected={currentView.type === "course_eval"}
              unlockedLessonIds={unlockedLessonIds}
              completedLessonIds={completedSet}
              unlockedModuleEvalIds={unlockedModuleEvalIds}
              passedModuleEvalIds={passedModuleEvalSet}
              courseEvalUnlocked={courseEvalUnlocked}
              courseEvalPassed={courseEvalPassed}
              progressPercent={progressPercent}
              onSelectLesson={(lessonId) => {
                if (!unlockedLessonIds.has(lessonId)) return;
                navigate({ type: "lesson", lessonId });
              }}
              onSelectModuleEval={(moduleId) => {
                if (!unlockedModuleEvalIds.has(moduleId)) return;
                navigate({ type: "module_eval", moduleId });
              }}
              onSelectCourseEval={() => {
                if (!courseEvalUnlocked) return;
                navigate({ type: "course_eval" });
              }}
            />
          </div>
        </div>
      </div>

      <main className="space-y-4  p-4 sm:p-6">
        {/* Overview / welcome screen */}
        {currentView.type === "overview" ? (
          <section className="space-y-4  p-6">
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
            {courseEvalPassed ? (
              <p className="text-sm font-medium text-success">
                Course completed!
              </p>
            ) : null}
            <button
              type="button"
              disabled={!launchLessonId}
              onClick={() => {
                if (!launchLessonId) return;
                navigate({ type: "lesson", lessonId: launchLessonId });
              }}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {startButtonLabel}
            </button>
          </section>
        ) : null}

        {/* Lesson view */}
        {currentView.type === "lesson" &&
        selectedLessonRef &&
        selectedModule ? (
          <LessonStage
            module={selectedModule}
            lesson={selectedLessonRef.lesson}
            canGoPrevious={canGoPreviousLesson}
            canGoNext={canGoNext}
            nextLabel={nextLabel}
            isSavingProgress={isPending}
            onPrevious={handleLessonPrevious}
            onNext={handleLessonNext}
            onInlineQuizGateChange={(blockId, passed) => {
              setInlineQuizGates((prev) => ({ ...prev, [blockId]: passed }));
            }}
          />
        ) : null}

        {/* Module evaluation view */}
        {currentView.type === "module_eval" && selectedModule?.evaluation ? (
          <EvaluationRunner
            evaluation={selectedModule.evaluation}
            enrollmentId={enrollmentId}
            courseRecordId={courseRecordId}
            courseSlug={course.slug}
            scope="MODULE"
            moduleId={selectedModule.id}
            onPass={() => handleModuleEvalPass(selectedModule.id)}
          />
        ) : null}

        {/* Course evaluation view */}
        {currentView.type === "course_eval" && course.courseEvaluation ? (
          <EvaluationRunner
            evaluation={course.courseEvaluation}
            enrollmentId={enrollmentId}
            courseRecordId={courseRecordId}
            courseSlug={course.slug}
            scope="COURSE"
            onPass={handleCourseEvalPass}
          />
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
