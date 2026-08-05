// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import InlineQuizRunner from "./Inline-quiz-runner";

function createBlock(overrides: Record<string, unknown> = {}) {
  return {
    id: "block-1",
    title: "Lesson intro",
    quiz: {
      title: "Inline Quiz",
      questions: [
        {
          id: "q1",
          prompt: "What is 2 + 2?",
          options: [
            { id: "a", text: "3" },
            { id: "b", text: "4" },
          ],
          correctOptionId: "b",
        },
        {
          id: "q2",
          prompt: "What color is the sky?",
          options: [
            { id: "c", text: "Red" },
            { id: "d", text: "Blue" },
          ],
          correctOptionId: "d",
        },
      ],
    },
    ...overrides,
  } as never;
}

describe("InlineQuizRunner", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the empty state when the quiz has no questions", () => {
    render(
      <InlineQuizRunner
        block={createBlock({ quiz: { title: "Empty Quiz", questions: [] } })}
        onGateChange={() => {}}
      />,
    );

    expect(screen.getByText(/This inline quiz is empty/i)).toBeDefined();
  });

  it("renders quiz questions and starts in an incomplete state", () => {
    const onGateChange = vi.fn();

    render(
      <InlineQuizRunner block={createBlock()} onGateChange={onGateChange} />,
    );

    expect(screen.getByText("Inline Quiz")).toBeDefined();
    expect(screen.getByText(/All answers must be correct/i)).toBeDefined();
    expect(screen.getByText(/1\. What is 2 \+ 2\?/i)).toBeDefined();
    expect(screen.getByRole("radio", { name: "4" })).toBeDefined();
    expect(onGateChange).toHaveBeenLastCalledWith(false);
  });

  it("shows feedback for incorrect answers and marks the quiz complete when all answers are correct", () => {
    const onGateChange = vi.fn();

    render(
      <InlineQuizRunner block={createBlock()} onGateChange={onGateChange} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "3" }));

    expect(screen.getByText(/Incorrect/i)).toBeDefined();
    expect(onGateChange).toHaveBeenLastCalledWith(false);

    fireEvent.click(screen.getByRole("radio", { name: "4" }));
    fireEvent.click(screen.getByRole("radio", { name: "Blue" }));

    expect(screen.getByText(/Inline quiz complete/i)).toBeDefined();
    expect(onGateChange).toHaveBeenLastCalledWith(true);
  });

  it("resets answers when the block id changes", () => {
    const { rerender } = render(
      <InlineQuizRunner
        block={createBlock({ id: "block-1" })}
        onGateChange={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "4" }));
    expect(
      (screen.getByRole("radio", { name: "4" }) as HTMLInputElement).checked,
    ).toBe(true);

    rerender(
      <InlineQuizRunner
        block={createBlock({ id: "block-2" })}
        onGateChange={() => {}}
      />,
    );

    expect(
      (screen.getByRole("radio", { name: "4" }) as HTMLInputElement).checked,
    ).toBe(false);
  });
});
