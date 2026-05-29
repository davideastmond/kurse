"use client";

import QuizWizard from "@/components/storyboard/quiz-wizard/Quiz-wizard";
import type { StoryboardQuiz } from "@/shared/types/storyboard";
import { useState } from "react";
import type { ModuleEvaluationCanvasProps } from "./definitions";

export default function ModuleEvaluationCanvas({
  evaluation,
  moduleId,
  readOnly = false,
  onUpdate,
  onDelete,
}: ModuleEvaluationCanvasProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(
    !readOnly && evaluation.questions.length === 0,
  );

  function handleWizardSave(quiz: StoryboardQuiz) {
    onUpdate(moduleId, {
      ...evaluation,
      title: quiz.title,
      passingScore: quiz.passingScore ?? evaluation.passingScore,
      questions: quiz.questions,
    });
    setIsWizardOpen(false);
  }

  function handleWizardClose() {
    setIsWizardOpen(false);
  }

  const initialQuiz: StoryboardQuiz = {
    title: evaluation.title,
    passingScore: evaluation.passingScore,
    questions: evaluation.questions,
  };

  return (
    <>
      <div className="rounded-lg border-2 border-amber-400/60 bg-amber-50/60 p-4 dark:border-amber-500/40 dark:bg-amber-950/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Module Evaluation
            </span>
          </div>
          {!readOnly ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsWizardOpen(true)}
                className="rounded px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-400/60 hover:bg-amber-100 dark:text-amber-400 dark:ring-amber-500/40 dark:hover:bg-amber-900/30"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(moduleId)}
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

      {!readOnly && isWizardOpen && (
        <QuizWizard
          initialQuiz={initialQuiz}
          onClose={handleWizardClose}
          onSave={handleWizardSave}
        />
      )}
    </>
  );
}
