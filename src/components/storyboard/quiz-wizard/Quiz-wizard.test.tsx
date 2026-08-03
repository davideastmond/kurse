// @vitest-environment jsdom

import type { StoryboardQuiz } from "@/shared/types/storyboard";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import QuizWizard from "./Quiz-wizard";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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

function renderQuizWizard(
  props?: Partial<React.ComponentProps<typeof QuizWizard>>,
) {
  const onClose = vi.fn();
  const onSave = vi.fn();

  render(<QuizWizard onClose={onClose} onSave={onSave} {...props} />);

  return { onClose, onSave };
}

describe("QuizWizard", () => {
  it("renders a default draft with one question and two starter options", () => {
    renderQuizWizard();

    expect(
      screen.getByRole("heading", { name: "Quiz & Evaluation Wizard" }),
    ).toBeTruthy();
    expect(screen.getByDisplayValue("Option 1")).toBeTruthy();
    expect(screen.getByDisplayValue("Option 2")).toBeTruthy();
    expect(screen.getAllByLabelText(/mark option/i)).toHaveLength(2);
  });

  it("falls back to a generated starter question when the initial quiz is empty", () => {
    renderQuizWizard({
      initialQuiz: createInitialQuiz({
        title: "Empty Quiz",
        passingScore: undefined,
        questions: [],
      }),
    });

    expect(screen.getByDisplayValue("Empty Quiz")).toBeTruthy();
    expect(screen.getByDisplayValue("70")).toBeTruthy();
    expect(screen.getByText("Question 1")).toBeTruthy();
    expect(screen.getByDisplayValue("Option 1")).toBeTruthy();
    expect(screen.getByDisplayValue("Option 2")).toBeTruthy();
  });

  it("backfills a missing second option and restores one checked correct answer", () => {
    renderQuizWizard({
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

    expect(screen.getByDisplayValue("Only option")).toBeTruthy();
    expect(screen.getByDisplayValue("Option 2")).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(
      radios.filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(1);
  });

  it("validates required fields before saving", () => {
    renderQuizWizard();

    fireEvent.change(screen.getByPlaceholderText("Quiz name"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Quiz" }));

    expect(screen.getByText("Quiz name is required.")).toBeTruthy();
  });

  it("validates invalid passing grade values from initial data", () => {
    const { onSave } = renderQuizWizard({
      initialQuiz: createInitialQuiz({
        title: "Invalid score quiz",
        passingScore: Number.NaN,
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Quiz" }));

    expect(
      screen.getByText("Passing grade must be between 0 and 100."),
    ).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("validates question prompt and option text before saving", () => {
    const { onSave } = renderQuizWizard({
      initialQuiz: createInitialQuiz({
        questions: [
          {
            id: "question-1",
            prompt: "   ",
            options: [
              { id: "option-1", text: "First" },
              { id: "option-2", text: "Second" },
            ],
            correctOptionId: "option-1",
          },
        ],
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Quiz" }));
    expect(screen.getByText("Each question needs a prompt.")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Write the question"), {
      target: { value: "Updated prompt" },
    });
    fireEvent.change(screen.getByDisplayValue("First"), {
      target: { value: "  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Quiz" }));

    expect(screen.getByText("Each answer option needs text.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("adds and removes questions, and preserves one fallback question", () => {
    renderQuizWizard();

    fireEvent.click(screen.getByRole("button", { name: "Add Question" }));
    expect(screen.getByText("Question 2")).toBeTruthy();

    const secondQuestionSection = screen
      .getByText("Question 2")
      .closest("section");
    expect(secondQuestionSection).toBeTruthy();
    const secondQuestionRemoveButton = within(
      secondQuestionSection as HTMLElement,
    )
      .getAllByRole("button", { name: "Remove" })
      .find((button) => !button.hasAttribute("disabled"));
    expect(secondQuestionRemoveButton).toBeTruthy();
    fireEvent.click(secondQuestionRemoveButton as HTMLButtonElement);
    expect(screen.queryByText("Question 2")).toBeNull();

    const firstQuestionSection = screen
      .getByText("Question 1")
      .closest("section");
    expect(firstQuestionSection).toBeTruthy();
    const firstQuestionRemoveButton = within(
      firstQuestionSection as HTMLElement,
    )
      .getAllByRole("button", { name: "Remove" })
      .find((button) => !button.hasAttribute("disabled"));
    expect(firstQuestionRemoveButton).toBeTruthy();
    fireEvent.click(firstQuestionRemoveButton as HTMLButtonElement);
    expect(screen.getByText("Question 1")).toBeTruthy();
  });

  it("adds options and reassigns the correct option when the selected one is removed", () => {
    renderQuizWizard({
      initialQuiz: createInitialQuiz(),
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Option" }));

    const optionThreeRadio = screen.getByLabelText(
      "Mark option 3 as correct",
    ) as HTMLInputElement;
    fireEvent.click(optionThreeRadio);
    expect(optionThreeRadio.checked).toBe(true);

    const optionThreeInput = screen.getByDisplayValue("Option 3");
    const optionThreeRow = optionThreeInput.closest("div");
    expect(optionThreeRow).toBeTruthy();
    fireEvent.click(
      within(optionThreeRow as HTMLElement).getByRole("button", {
        name: "Remove",
      }),
    );

    expect(screen.queryByLabelText("Mark option 3 as correct")).toBeNull();
    expect(
      (screen.getByLabelText("Mark option 1 as correct") as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it("saves a trimmed quiz payload when valid", () => {
    const { onSave } = renderQuizWizard({
      initialQuiz: createInitialQuiz({
        title: "  Trimmed title  ",
        questions: [
          {
            id: "question-1",
            prompt: "  Prompt with spaces  ",
            options: [
              { id: "option-1", text: "  First choice  " },
              { id: "option-2", text: "  Second choice  " },
            ],
            correctOptionId: "option-2",
          },
        ],
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Quiz" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      title: "Trimmed title",
      passingScore: 85,
      questions: [
        {
          id: "question-1",
          prompt: "Prompt with spaces",
          options: [
            { id: "option-1", text: "First choice" },
            { id: "option-2", text: "Second choice" },
          ],
          correctOptionId: "option-2",
        },
      ],
    });
  });

  it("calls close handlers from close and cancel buttons", () => {
    const { onClose } = renderQuizWizard();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("normalizes numeric input bounds for passing grade and AI question count", () => {
    renderQuizWizard({
      initialQuiz: createInitialQuiz({ passingScore: 85 }),
      onGenerateWithAi: async () => createInitialQuiz(),
      defaultAiQuestionCount: 7,
    });

    const passingGradeInput = screen.getByDisplayValue("85");
    fireEvent.change(passingGradeInput, { target: { value: "140" } });
    expect(screen.getByDisplayValue("100")).toBeTruthy();

    fireEvent.change(screen.getByDisplayValue("100"), {
      target: { value: "" },
    });
    expect(screen.getByDisplayValue("0")).toBeTruthy();

    const aiCountInput = screen.getByDisplayValue("7");
    fireEvent.change(aiCountInput, { target: { value: "" } });
    expect(screen.getByDisplayValue("7")).toBeTruthy();
  });

  it("shows AI draft controls and generates quiz content", async () => {
    const onGenerateWithAi = vi.fn(async () =>
      createInitialQuiz({
        title: "AI Draft",
        passingScore: undefined,
        questions: [
          {
            id: "question-1",
            prompt: "Generated prompt",
            options: [{ id: "option-1", text: "Generated option" }],
            correctOptionId: "missing-option",
          },
        ],
      }),
    );

    renderQuizWizard({
      initialQuiz: createInitialQuiz({ passingScore: 81 }),
      onGenerateWithAi,
      defaultAiQuestionCount: 7,
    });

    expect(screen.getByText("AI Quiz Draft")).toBeTruthy();
    const questionCountInput = screen.getByDisplayValue("7");
    fireEvent.change(questionCountInput, { target: { value: "14" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate With AI" }));

    await waitFor(() => {
      expect(onGenerateWithAi).toHaveBeenCalledWith(12);
    });

    expect(screen.getByDisplayValue("AI Draft")).toBeTruthy();
    expect(screen.getByDisplayValue("81")).toBeTruthy();
    expect(screen.getByDisplayValue("Generated option")).toBeTruthy();
    expect(screen.getByDisplayValue("Option 2")).toBeTruthy();
  });

  it("shows AI generation errors and resets loading state", async () => {
    const onGenerateWithAi = vi.fn(async () => {
      throw new Error("AI service unavailable");
    });

    renderQuizWizard({
      onGenerateWithAi,
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate With AI" }));

    await waitFor(() => {
      expect(screen.getByText("AI service unavailable")).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Generate With AI" }),
    ).toBeTruthy();
  });

  it("uses fallback AI error text for non-Error rejections", async () => {
    const onGenerateWithAi = vi.fn(async () => {
      throw "bad";
    });

    renderQuizWizard({
      onGenerateWithAi,
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate With AI" }));

    await waitFor(() => {
      expect(
        screen.getByText("Unable to generate quiz with AI right now."),
      ).toBeTruthy();
    });
  });
});
