"use client";

import { submitEvaluationAttempt } from "@/app/actions/course-runner";
import type { EvaluationRunnerProps } from "@/components/course-runner/definitions";
import { useState, useTransition } from "react";

type QuestionState = {
  answers: Record<string, string>;
  currentIndex: number;
};

type EvalResult = {
  passed: boolean;
  score: number;
  attemptId: string;
};

export default function EvaluationRunner({
  evaluation,
  enrollmentId,
  courseRecordId,
  courseSlug,
  scope,
  moduleId,
  previewMode = false,
  onPass,
}: EvaluationRunnerProps) {
  const [isPending, startTransition] = useTransition();
  const [questionState, setQuestionState] = useState<QuestionState>({
    answers: {},
    currentIndex: 0,
  });
  const [result, setResult] = useState<EvalResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const questions = evaluation.questions;
  const totalQuestions = questions.length;
  const { answers, currentIndex } = questionState;
  const currentQuestion = questions[currentIndex];
  const selectedOptionId = currentQuestion
    ? (answers[currentQuestion.id] ?? null)
    : null;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const canAdvance = Boolean(selectedOptionId);

  function handleSelect(optionId: string) {
    if (!currentQuestion || result) {
      return;
    }

    setQuestionState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [currentQuestion.id]: optionId },
    }));
  }

  function handleNext() {
    if (!canAdvance || isLastQuestion) {
      return;
    }

    setQuestionState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
    }));
  }

  function handlePrevious() {
    if (currentIndex === 0) {
      return;
    }

    setQuestionState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex - 1,
    }));
  }

  function handleSubmit() {
    if (!canAdvance) {
      return;
    }

    setErrorMessage(null);

    if (previewMode) {
      const correctCount = questions.filter(
        (question) => answers[question.id] === question.correctOptionId,
      ).length;
      const scorePercent = (correctCount / questions.length) * 100;
      const passed = scorePercent >= evaluation.passingScore;

      setResult({
        passed,
        score: scorePercent,
        attemptId: "preview-attempt",
      });
      return;
    }

    startTransition(async () => {
      const res = await submitEvaluationAttempt({
        enrollmentId,
        courseRecordId,
        courseSlug,
        scope,
        moduleId,
        answers,
      });

      if (!res.ok) {
        setErrorMessage(res.message);
        return;
      }

      setResult({
        passed: res.passed,
        score: res.score,
        attemptId: res.attemptId,
      });
    });
  }

  function handleRetake() {
    setQuestionState({ answers: {}, currentIndex: 0 });
    setResult(null);
    setErrorMessage(null);
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning">
        This evaluation has no questions yet. Add questions in the storyboard
        editor.
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (result) {
    const correctCount = questions.filter(
      (q) => answers[q.id] === q.correctOptionId,
    ).length;

    return (
      <section className="space-y-5">
        <header className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {scope === "MODULE" ? "Module Evaluation" : "Course Evaluation"} —
            Results
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {evaluation.title}
          </h2>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <span
              className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                result.passed
                  ? "bg-success/15 text-success"
                  : "bg-danger/15 text-danger"
              }`}
            >
              {result.passed ? "Passed" : "Failed"}
            </span>
            <span className="text-sm font-medium text-foreground">
              {Math.round(result.score)}%&nbsp;
              <span className="text-muted-foreground">
                ({correctCount}/{totalQuestions} correct · passing score{" "}
                {evaluation.passingScore}%)
              </span>
            </span>
          </div>
        </header>

        <div className="space-y-3">
          {questions.map((question, index) => {
            const chosenId = answers[question.id];
            const isCorrect = chosenId === question.correctOptionId;
            const chosenOption = question.options.find(
              (o) => o.id === chosenId,
            );
            const correctOption = question.options.find(
              (o) => o.id === question.correctOptionId,
            );

            return (
              <article
                key={question.id}
                className={`space-y-2 rounded-2xl border p-4 ${
                  isCorrect
                    ? "border-success/40 bg-success/10"
                    : "border-danger/40 bg-danger/10"
                }`}
              >
                <p className="text-sm font-semibold text-foreground">
                  {index + 1}. {question.prompt}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your answer:{" "}
                  <span
                    className={`font-medium ${isCorrect ? "text-success" : "text-danger"}`}
                  >
                    {chosenOption?.text ?? "—"}
                  </span>
                </p>
                {!isCorrect ? (
                  <p className="text-sm text-muted-foreground">
                    Correct answer:{" "}
                    <span className="font-medium text-success">
                      {correctOption?.text ?? "—"}
                    </span>
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        <footer className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
          {result.passed ? (
            <button
              type="button"
              onClick={onPass}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Continue
            </button>
          ) : (
            <>
              <p className="flex-1 text-sm text-muted-foreground">
                You need {evaluation.passingScore}% to pass. Try again!
              </p>
              <button
                type="button"
                onClick={handleRetake}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Retake
              </button>
            </>
          )}
        </footer>
      </section>
    );
  }

  // ── Question screen ─────────────────────────────────────────────────────────
  if (!currentQuestion) {
    return null;
  }

  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {scope === "MODULE" ? "Module Evaluation" : "Course Evaluation"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {evaluation.title}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {currentIndex + 1} / {totalQuestions}
          </span>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>
      </header>

      <fieldset className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <legend className="mb-4 text-base font-semibold text-foreground">
          {currentQuestion.prompt}
        </legend>

        <div className="space-y-2">
          {currentQuestion.options.map((option) => {
            const checked = selectedOptionId === option.id;

            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${
                  checked
                    ? "border-primary/60 bg-primary/10 font-semibold text-foreground"
                    : "border-border bg-muted/20 text-foreground hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name={`eval-question-${currentQuestion.id}`}
                  checked={checked}
                  onChange={() => handleSelect(option.id)}
                  className="accent-primary"
                />
                {option.text}
              </label>
            );
          })}
        </div>
      </fieldset>

      {errorMessage ? (
        <p className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <footer className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || isPending}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        {isLastQuestion ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canAdvance || isPending}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Submitting..." : "Submit"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance || isPending}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        )}
      </footer>
    </section>
  );
}
