"use client";

import type { InlineQuizRunnerProps } from "@/components/course-runner/definitions";
import { useEffect, useMemo, useRef, useState } from "react";

export default function InlineQuizRunner({
  block,
  onGateChange,
}: InlineQuizRunnerProps) {
  const questions = block.quiz?.questions ?? [];
  const [answersByQuestionId, setAnswersByQuestionId] = useState<
    Record<string, string>
  >({});

  // Keep a stable ref to the latest callback so the quiz-state effect below
  // doesn't need onGateChange in its dependency array (which would be a new
  // reference on every parent render and cause an infinite loop).
  const onGateChangeRef = useRef(onGateChange);
  useEffect(() => {
    onGateChangeRef.current = onGateChange;
  });

  useEffect(() => {
    setAnswersByQuestionId({});
  }, [block.id]);

  const quizState = useMemo(() => {
    if (questions.length === 0) {
      return {
        hasQuiz: false,
        allAnswered: false,
        allCorrect: false,
      };
    }

    const allAnswered = questions.every((question) => {
      return Boolean(answersByQuestionId[question.id]);
    });

    const allCorrect =
      allAnswered &&
      questions.every((question) => {
        return answersByQuestionId[question.id] === question.correctOptionId;
      });

    return {
      hasQuiz: true,
      allAnswered,
      allCorrect,
    };
  }, [answersByQuestionId, questions]);

  useEffect(() => {
    onGateChangeRef.current(quizState.hasQuiz && quizState.allCorrect);
  }, [quizState.allCorrect, quizState.hasQuiz]);

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
        This inline quiz is empty. Add questions in the storyboard editor.
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <header className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          {block.quiz?.title || block.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          All answers must be correct to unlock the next lesson.
        </p>
      </header>

      {questions.map((question, questionIndex) => {
        const selectedOptionId = answersByQuestionId[question.id];
        const showFeedback = Boolean(selectedOptionId);
        const isCorrect = selectedOptionId === question.correctOptionId;

        return (
          <fieldset
            key={question.id}
            className="space-y-3 rounded-xl border border-border/80 bg-muted/25 p-4"
          >
            <legend className="mb-2 text-sm font-semibold text-foreground">
              {questionIndex + 1}. {question.prompt}
            </legend>

            <div className="space-y-2">
              {question.options.map((option) => {
                const checked = selectedOptionId === option.id;
                return (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
                  >
                    <input
                      type="radio"
                      name={`${block.id}-${question.id}`}
                      checked={checked}
                      onChange={() => {
                        setAnswersByQuestionId((current) => ({
                          ...current,
                          [question.id]: option.id,
                        }));
                      }}
                    />
                    <span>{option.text}</span>
                  </label>
                );
              })}
            </div>

            {showFeedback ? (
              <p
                className={`text-xs font-medium ${isCorrect ? "text-success" : "text-danger"}`}
              >
                {isCorrect
                  ? "Correct"
                  : "Incorrect. Select the correct option to continue."}
              </p>
            ) : null}
          </fieldset>
        );
      })}

      {!quizState.allCorrect ? (
        <p className="text-sm font-medium text-warning">
          Lesson gate is locked until all inline quiz questions are correct.
        </p>
      ) : (
        <p className="text-sm font-medium text-success">
          Inline quiz complete. You can continue.
        </p>
      )}
    </section>
  );
}
