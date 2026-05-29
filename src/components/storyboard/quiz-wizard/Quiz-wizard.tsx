"use client";

import type {
  QuizWizardProps,
  QuizWizardQuestionDraft,
} from "@/components/storyboard/quiz-wizard/definitions";
import type { QuizQuestion, StoryboardQuiz } from "@/shared/types/storyboard";
import { useCallback, useState } from "react";

function createId(prefix: string) {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 10)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  return `${prefix}_${randomPart}`;
}

function createOption(text = "") {
  return {
    id: createId("option"),
    text,
  };
}

function createQuestion(): QuizWizardQuestionDraft {
  const firstOption = createOption("Option 1");
  const secondOption = createOption("Option 2");

  return {
    id: createId("question"),
    prompt: "",
    options: [firstOption, secondOption],
    correctOptionId: firstOption.id,
  };
}

function normalizeQuiz(initialQuiz?: StoryboardQuiz): {
  title: string;
  passingScore: number;
  questions: QuizWizardQuestionDraft[];
} {
  if (!initialQuiz) {
    return {
      title: "",
      passingScore: 70,
      questions: [createQuestion()],
    };
  }

  return {
    title: initialQuiz.title,
    passingScore: initialQuiz.passingScore ?? 70,
    questions:
      initialQuiz.questions.length > 0
        ? initialQuiz.questions.map((question) => {
            const nextOptions = [...question.options];

            while (nextOptions.length < 2) {
              nextOptions.push(
                createOption(`Option ${nextOptions.length + 1}`),
              );
            }

            return {
              ...question,
              options: nextOptions,
              correctOptionId:
                nextOptions.find(
                  (option) => option.id === question.correctOptionId,
                )?.id ??
                nextOptions[0]?.id ??
                "",
            };
          })
        : [createQuestion()],
  };
}

function validateQuiz(
  quizTitle: string,
  passingScore: number,
  questions: QuizWizardQuestionDraft[],
) {
  if (!quizTitle.trim()) {
    return "Quiz name is required.";
  }

  if (
    !Number.isFinite(passingScore) ||
    passingScore < 0 ||
    passingScore > 100
  ) {
    return "Passing grade must be between 0 and 100.";
  }

  for (const question of questions) {
    if (!question.prompt.trim()) {
      return "Each question needs a prompt.";
    }

    if (question.options.length < 2) {
      return "Each question needs at least two answer options.";
    }

    for (const option of question.options) {
      if (!option.text.trim()) {
        return "Each answer option needs text.";
      }
    }

    const hasCorrectOption = question.options.some(
      (option) => option.id === question.correctOptionId,
    );

    if (!hasCorrectOption) {
      return "Each question needs one correct response selected.";
    }
  }

  return null;
}

export default function QuizWizard({
  initialQuiz,
  onClose,
  onSave,
  onGenerateWithAi,
  defaultAiQuestionCount = 5,
}: QuizWizardProps) {
  const [{ title, passingScore, questions }, setDraft] = useState(() =>
    normalizeQuiz(initialQuiz),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [aiQuestionCount, setAiQuestionCount] = useState(
    defaultAiQuestionCount,
  );

  const updateQuestion = useCallback(
    (
      questionId: string,
      updater: (question: QuizWizardQuestionDraft) => QuizWizardQuestionDraft,
    ) => {
      setDraft((current) => ({
        ...current,
        questions: current.questions.map((question) =>
          question.id === questionId ? updater(question) : question,
        ),
      }));
    },
    [],
  );

  const handleAddQuestion = useCallback(() => {
    setDraft((current) => ({
      ...current,
      questions: [...current.questions, createQuestion()],
    }));
  }, []);

  const handleRemoveQuestion = useCallback((questionId: string) => {
    setDraft((current) => {
      const nextQuestions = current.questions.filter(
        (question) => question.id !== questionId,
      );

      return {
        ...current,
        questions:
          nextQuestions.length > 0 ? nextQuestions : [createQuestion()],
      };
    });
  }, []);

  const handleAddOption = useCallback(
    (questionId: string) => {
      updateQuestion(questionId, (question) => {
        const nextOption = createOption(
          `Option ${question.options.length + 1}`,
        );
        return {
          ...question,
          options: [...question.options, nextOption],
        };
      });
    },
    [updateQuestion],
  );

  const handleRemoveOption = useCallback(
    (questionId: string, optionId: string) => {
      updateQuestion(questionId, (question) => {
        if (question.options.length <= 2) {
          return question;
        }

        const nextOptions = question.options.filter(
          (option) => option.id !== optionId,
        );
        const nextCorrectOptionId =
          question.correctOptionId === optionId
            ? (nextOptions[0]?.id ?? "")
            : question.correctOptionId;

        return {
          ...question,
          options: nextOptions,
          correctOptionId: nextCorrectOptionId,
        };
      });
    },
    [updateQuestion],
  );

  const handleSave = useCallback(() => {
    const validationError = validateQuiz(title, passingScore, questions);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const nextQuiz: StoryboardQuiz = {
      title: title.trim(),
      passingScore,
      questions: questions.map<QuizQuestion>((question) => ({
        id: question.id,
        prompt: question.prompt.trim(),
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text.trim(),
        })),
        correctOptionId: question.correctOptionId,
      })),
    };

    onSave(nextQuiz);
  }, [onSave, passingScore, questions, title]);

  const handleGenerateWithAi = useCallback(async () => {
    if (!onGenerateWithAi || isGeneratingWithAi) {
      return;
    }

    setErrorMessage(null);
    setIsGeneratingWithAi(true);

    try {
      const generatedQuiz = await onGenerateWithAi(aiQuestionCount);
      setDraft((current) => {
        const normalized = normalizeQuiz(generatedQuiz);
        return {
          ...normalized,
          passingScore: generatedQuiz.passingScore ?? current.passingScore,
        };
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to generate quiz with AI right now.";
      setErrorMessage(errorMessage);
    } finally {
      setIsGeneratingWithAi(false);
    }
  }, [aiQuestionCount, isGeneratingWithAi, onGenerateWithAi]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/35 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-violet-200 bg-surface p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            Quiz & Evaluation Wizard
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Quiz Name
          </label>
          <input
            type="text"
            value={title}
            onChange={(event) => {
              setDraft((current) => ({
                ...current,
                title: event.target.value,
              }));
            }}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="Quiz name"
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Passing Grade (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={passingScore}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              setDraft((current) => ({
                ...current,
                passingScore: Number.isFinite(parsed)
                  ? Math.max(0, Math.min(100, parsed))
                  : 0,
              }));
            }}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="70"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Learners need this score or higher to pass.
          </p>
        </div>

        {onGenerateWithAi ? (
          <div className="mt-4 rounded-2xl border border-violet-200/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
              AI Quiz Draft
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="text-xs font-medium text-violet-800">
                Questions
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={aiQuestionCount}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(parsed)) {
                    setAiQuestionCount(Math.max(1, Math.min(12, parsed)));
                  }
                }}
                className="w-20 rounded-lg border border-violet-300 px-2 py-1.5 text-sm text-foreground focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => {
                  void handleGenerateWithAi();
                }}
                disabled={isGeneratingWithAi}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isGeneratingWithAi ? "Generating..." : "Generate With AI"}
              </button>
            </div>
            <p className="mt-2 text-xs text-violet-800/80">
              Generates a draft from course content. Review before saving.
            </p>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {questions.map((question, questionIndex) => (
            <section
              key={question.id}
              className="space-y-4 rounded-2xl border border-violet-200 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                  Question {questionIndex + 1}
                </p>
                <button
                  onClick={() => handleRemoveQuestion(question.id)}
                  className="rounded-lg border border-violet-200 bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 transition-colors hover:bg-violet-50"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Prompt
                </label>
                <input
                  type="text"
                  value={question.prompt}
                  onChange={(event) => {
                    updateQuestion(question.id, (current) => ({
                      ...current,
                      prompt: event.target.value,
                    }));
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Write the question"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Answer Options (single correct)
                </p>
                {question.options.map((option, optionIndex) => (
                  <div
                    key={option.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3"
                  >
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={question.correctOptionId === option.id}
                      onChange={() => {
                        updateQuestion(question.id, (current) => ({
                          ...current,
                          correctOptionId: option.id,
                        }));
                      }}
                      className="h-4 w-4 accent-violet-600"
                      aria-label={`Mark option ${optionIndex + 1} as correct`}
                    />
                    <input
                      type="text"
                      value={option.text}
                      onChange={(event) => {
                        updateQuestion(question.id, (current) => ({
                          ...current,
                          options: current.options.map((candidate) =>
                            candidate.id === option.id
                              ? {
                                  ...candidate,
                                  text: event.target.value,
                                }
                              : candidate,
                          ),
                        }));
                      }}
                      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      placeholder={`Option ${optionIndex + 1}`}
                    />
                    <button
                      onClick={() => handleRemoveOption(question.id, option.id)}
                      disabled={question.options.length <= 2}
                      className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleAddOption(question.id)}
                  className="rounded-lg border border-violet-200 bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 transition-colors hover:bg-violet-50"
                >
                  Add Option
                </button>
              </div>
            </section>
          ))}

          <button
            onClick={handleAddQuestion}
            className="rounded-lg border border-violet-200 bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 transition-colors hover:bg-violet-50"
          >
            Add Question
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleSave}
            disabled={isGeneratingWithAi}
            className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-violet-700"
          >
            Save Quiz
          </button>
          <button
            onClick={onClose}
            disabled={isGeneratingWithAi}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
