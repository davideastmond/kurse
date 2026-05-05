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
  questions: QuizWizardQuestionDraft[];
} {
  if (!initialQuiz) {
    return {
      title: "",
      questions: [createQuestion()],
    };
  }

  return {
    title: initialQuiz.title,
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

function validateQuiz(quizTitle: string, questions: QuizWizardQuestionDraft[]) {
  if (!quizTitle.trim()) {
    return "Quiz name is required.";
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
}: QuizWizardProps) {
  const [{ title, questions }, setDraft] = useState(() =>
    normalizeQuiz(initialQuiz),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    const validationError = validateQuiz(title, questions);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const nextQuiz: StoryboardQuiz = {
      title: title.trim(),
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
  }, [onSave, questions, title]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-violet-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold text-slate-950">Quiz Wizard</h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-5">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
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
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="Quiz name"
          />
        </div>

        <div className="mt-6 space-y-4">
          {questions.map((question, questionIndex) => (
            <section
              key={question.id}
              className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
                  Question {questionIndex + 1}
                </p>
                <button
                  onClick={() => handleRemoveQuestion(question.id)}
                  className="rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 transition-colors hover:bg-violet-50"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
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
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Write the question"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
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
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      placeholder={`Option ${optionIndex + 1}`}
                    />
                    <button
                      onClick={() => handleRemoveOption(question.id, option.id)}
                      disabled={question.options.length <= 2}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleAddOption(question.id)}
                  className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 transition-colors hover:bg-violet-50"
                >
                  Add Option
                </button>
              </div>
            </section>
          ))}

          <button
            onClick={handleAddQuestion}
            className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 transition-colors hover:bg-violet-50"
          >
            Add Question
          </button>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-violet-700"
          >
            Save Quiz
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
