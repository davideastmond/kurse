"use client";

import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";
import QuizWizard from "@/components/storyboard/quiz-wizard/Quiz-wizard";
import { useCallback, useState } from "react";

export default function QuizInlineBlockDetail({
  block,
  onUpdateBlock,
  moduleId,
  lessonId,
}: BlockDetailComponentProps) {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleSaveQuiz = useCallback(
    (quiz: NonNullable<typeof block.quiz>) => {
      if (moduleId && lessonId && onUpdateBlock) {
        onUpdateBlock(moduleId, lessonId, block.id, { quiz });
      }

      setIsWizardOpen(false);
    },
    [block, lessonId, moduleId, onUpdateBlock],
  );

  const questionCount = block.quiz?.questions.length ?? 0;

  return (
    <>
      <div className="mt-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold text-foreground">
            {block.title}
          </h3>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
            Quiz
          </span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {block.detail}
        </p>
        <div className="space-y-3 rounded-3xl border border-violet-200 bg-violet-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
            Quiz Configuration
          </p>
          <div className="rounded-2xl border border-violet-100 bg-surface p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Name: {block.quiz?.title || "Untitled quiz"}
            </p>
            <p className="mt-1 text-muted-foreground">
              Questions: {questionCount}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Multiple-choice only. Each question has one correct answer.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Duration: {block.duration}
          </p>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 transition-colors hover:bg-violet-100"
          >
            Edit
          </button>
        </div>
      </div>

      {isWizardOpen ? (
        <QuizWizard
          initialQuiz={block.quiz}
          onClose={() => setIsWizardOpen(false)}
          onSave={handleSaveQuiz}
        />
      ) : null}
    </>
  );
}
