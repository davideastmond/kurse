"use client";

import { generateCourseEvaluationQuiz } from "@/app/actions/courses";
import QuizWizard from "@/components/storyboard/quiz-wizard/Quiz-wizard";
import type { StoryboardQuiz } from "@/shared/types/storyboard";
import { useCallback, useState } from "react";
import type { CourseEvaluationCanvasProps } from "./definitions";

export default function CourseEvaluationCanvas({
  evaluation,
  courseRecordId,
  isSelected,
  readOnly = false,
  onSelect,
  onUpdate,
  onDelete,
}: CourseEvaluationCanvasProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(
    !readOnly && evaluation.questions.length === 0,
  );

  function handleWizardSave(quiz: StoryboardQuiz) {
    onUpdate({
      ...evaluation,
      title: quiz.title,
      passingScore: quiz.passingScore ?? evaluation.passingScore,
      questions: quiz.questions,
    });
    setIsWizardOpen(false);
  }

  const handleGenerateWithAi = useCallback(
    async (numberOfQuestions: number) => {
      const result = await generateCourseEvaluationQuiz({
        courseId: courseRecordId,
        numberOfQuestions,
      });

      if (!result.ok) {
        throw new Error(result.message);
      }

      return result.quiz;
    },
    [courseRecordId],
  );

  const initialQuiz: StoryboardQuiz = {
    title: evaluation.title,
    passingScore: evaluation.passingScore,
    questions: evaluation.questions,
  };

  // TODO: color contrast needs to be improved
  return (
    <>
      <div
        className={`rounded-3xl border-2 p-5 transition-all ${
          isSelected
            ? "border-violet-400/70 bg-violet-100/70 ring-2 ring-violet-200 shadow-[0_16px_40px_rgba(139,92,246,0.16)] dark:border-violet-400/60 dark:bg-violet-950/25"
            : "border-violet-300/60 bg-violet-50/60 dark:border-violet-500/40 dark:bg-violet-950/20"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onSelect}
            className="text-xs font-semibold uppercase tracking-wide text-violet-800 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
          >
            Course Evaluation
            {isSelected ? (
              <span className="ml-2 rounded-full bg-violet-200 px-2 py-0.5 text-[10px] tracking-[0.12em] text-violet-800 dark:bg-violet-700/40 dark:text-violet-100">
                Selected
              </span>
            ) : null}
          </button>
          {!readOnly ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="rounded px-2 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-400/60 hover:bg-violet-100 dark:text-violet-300 dark:ring-violet-500/40 dark:hover:bg-violet-900/30"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded px-2 py-1 text-xs font-medium text-red-600 ring-1 ring-red-300/60 hover:bg-red-50 dark:text-red-400 dark:ring-red-500/40 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>

        <p className="text-sm font-medium text-foreground">
          {evaluation.title || "Untitled Evaluation"}
        </p>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span>
            {evaluation.questions.length} question
            {evaluation.questions.length !== 1 ? "s" : ""}
          </span>
          <span>Passing score: {evaluation.passingScore}%</span>
        </div>
      </div>

      {!readOnly && isWizardOpen ? (
        <QuizWizard
          initialQuiz={initialQuiz}
          onClose={() => setIsWizardOpen(false)}
          onSave={handleWizardSave}
          onGenerateWithAi={handleGenerateWithAi}
          defaultAiQuestionCount={5}
        />
      ) : null}
    </>
  );
}
