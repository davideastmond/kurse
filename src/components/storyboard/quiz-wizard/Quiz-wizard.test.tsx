import type { StoryboardQuiz } from "@/shared/types/storyboard";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import QuizWizard from "./Quiz-wizard";

function renderQuizWizard(
  props?: Partial<React.ComponentProps<typeof QuizWizard>>,
) {
  return renderToStaticMarkup(
    <QuizWizard onClose={() => {}} onSave={() => {}} {...props} />,
  );
}

function createInitialQuiz(
  overrides?: Partial<StoryboardQuiz>,
): StoryboardQuiz {
  return {
    title: "Knowledge Check",
    passingScore: 85,
    questions: [
      {
        id: "question-1",
        prompt: "What is the correct answer?",
        options: [
          { id: "option-1", text: "First" },
          { id: "option-2", text: "Second" },
        ],
        correctOptionId: "option-2",
      },
    ],
    ...overrides,
  };
}

describe("QuizWizard", () => {
  it("renders a default draft with one question and two starter options", () => {
    const html = renderQuizWizard();

    expect(html).toContain("Quiz &amp; Evaluation Wizard");
    expect(html).toContain("Question 1");
    expect(html).toContain('value="Option 1"');
    expect(html).toContain('value="Option 2"');
    expect((html.match(/aria-label="Mark option/g) ?? []).length).toBe(2);
  });

  it("falls back to a generated starter question when the initial quiz is empty", () => {
    const html = renderQuizWizard({
      initialQuiz: createInitialQuiz({
        title: "Empty Quiz",
        passingScore: undefined,
        questions: [],
      }),
    });

    expect(html).toContain('value="Empty Quiz"');
    expect(html).toContain('value="70"');
    expect(html).toContain("Question 1");
    expect(html).toContain('value="Option 1"');
    expect(html).toContain('value="Option 2"');
  });

  it("backfills a missing second option and restores one checked correct answer", () => {
    const html = renderQuizWizard({
      initialQuiz: createInitialQuiz({
        questions: [
          {
            id: "question-1",
            prompt: "Pick one",
            options: [{ id: "option-1", text: "Only option" }],
            correctOptionId: "missing-option",
          },
        ],
      }),
    });

    expect(html).toContain('value="Only option"');
    expect(html).toContain('value="Option 2"');
    expect((html.match(/name="correct-question-1"/g) ?? []).length).toBe(2);
    expect((html.match(/checked=""/g) ?? []).length).toBe(1);
  });

  it("shows AI draft controls when quiz generation is available", () => {
    const html = renderQuizWizard({
      onGenerateWithAi: async () => createInitialQuiz(),
      defaultAiQuestionCount: 7,
    });

    expect(html).toContain("AI Quiz Draft");
    expect(html).toContain("Generate With AI");
    expect(html).toContain('value="7"');
  });
});
