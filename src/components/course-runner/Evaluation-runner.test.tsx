// @vitest-environment jsdom
import { submitEvaluationAttempt } from "@/app/actions/course-runner";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EvaluationRunner from "./Evaluation-runner";

vi.mock("@/app/actions/course-runner", () => ({
  submitEvaluationAttempt: vi.fn(),
}));

const mockedSubmitEvaluationAttempt = vi.mocked(submitEvaluationAttempt);

describe("EvaluationRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the empty state when no questions are available", () => {
    render(
      <EvaluationRunner
        evaluation={{
          id: "",
          title: "Sample Evaluation",
          passingScore: 0,
          questions: [],
        }}
        enrollmentId={""}
        courseRecordId={""}
        courseSlug={""}
        scope={"MODULE"}
        onPass={function (): void {
          throw new Error("Function not implemented.");
        }}
      />,
    );

    expect(
      screen.getByText(/This evaluation has no questions yet/i),
    ).toBeDefined();
  });
  it("doesn't show the next button when there are is only one question", () => {
    render(
      <EvaluationRunner
        evaluation={{
          id: "",
          title: "Sample Evaluation",
          passingScore: 0,
          questions: [
            {
              id: "1",
              prompt: "Orthography scapes",
              options: [
                { id: "a", text: "linear" },
                { id: "b", text: "exponential" },
                { id: "c", text: "quadratic" },
              ],
              correctOptionId: "b",
            },
          ],
        }}
        enrollmentId={""}
        courseRecordId={""}
        courseSlug={""}
        scope={"MODULE"}
        onPass={function (): void {
          throw new Error("Function not implemented.");
        }}
      />,
    );

    expect(screen.queryByTestId("next-button")).toBeNull();
  });
  it("renders the questions when they are available", async () => {
    render(
      <EvaluationRunner
        evaluation={{
          id: "",
          title: "Sample Evaluation",
          passingScore: 0,
          questions: [
            {
              id: "1",
              prompt: "What is 2 + 2?",
              options: [
                { id: "a", text: "3" },
                { id: "b", text: "4" },
                { id: "c", text: "5" },
              ],
              correctOptionId: "b",
            },
            {
              id: "2",
              prompt: "What is tomato juice?",
              options: [
                { id: "a", text: "Red" },
                { id: "b", text: "Green" },
                { id: "c", text: "Yellow" },
              ],
              correctOptionId: "c",
            },
          ],
        }}
        enrollmentId={""}
        courseRecordId={""}
        courseSlug={""}
        scope={"MODULE"}
        onPass={function (): void {
          throw new Error("Function not implemented.");
        }}
      />,
    );

    expect(screen.getByText(/What is 2 \+ 2\?/i)).toBeDefined();
    expect(screen.getByText(/3/i)).toBeDefined();
    expect(screen.getByText(/4/i)).toBeDefined();
    expect(screen.getByText(/5/i)).toBeDefined();

    // Expect the next button to be disabled initially
    const nextButton = screen.getByTestId("next-button");
    expect((nextButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("allows moving to the next question after selecting an answer", () => {
    render(
      <EvaluationRunner
        evaluation={{
          id: "",
          title: "Sample Evaluation",
          passingScore: 0,
          questions: [
            {
              id: "1",
              prompt: "What is 2 + 2?",
              options: [
                { id: "a", text: "3" },
                { id: "b", text: "4" },
              ],
              correctOptionId: "b",
            },
            {
              id: "2",
              prompt: "What is tomato juice?",
              options: [
                { id: "a", text: "Red" },
                { id: "b", text: "Green" },
              ],
              correctOptionId: "a",
            },
          ],
        }}
        enrollmentId={""}
        courseRecordId={""}
        courseSlug={""}
        scope={"MODULE"}
        onPass={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "4" }));

    const nextButton = screen.getByTestId("next-button");
    expect((nextButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(nextButton);

    expect(screen.getByText(/What is tomato juice\?/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDefined();
  });

  it("shows a preview result when the evaluation is submitted in preview mode", () => {
    render(
      <EvaluationRunner
        evaluation={{
          id: "",
          title: "Preview Evaluation",
          passingScore: 100,
          questions: [
            {
              id: "1",
              prompt: "What is 2 + 2?",
              options: [
                { id: "a", text: "3" },
                { id: "b", text: "4" },
              ],
              correctOptionId: "b",
            },
          ],
        }}
        enrollmentId={""}
        courseRecordId={""}
        courseSlug={""}
        scope={"MODULE"}
        previewMode
        onPass={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "4" }));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText(/Passed/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDefined();
  });

  it("shows an error message when the evaluation submission fails", async () => {
    mockedSubmitEvaluationAttempt.mockResolvedValue({
      ok: false,
      message: "Submission failed",
      passed: false,
      score: 0,
      attemptId: "",
    } as never);

    render(
      <EvaluationRunner
        evaluation={{
          id: "",
          title: "Sample Evaluation",
          passingScore: 0,
          questions: [
            {
              id: "1",
              prompt: "What is 2 + 2?",
              options: [
                { id: "a", text: "3" },
                { id: "b", text: "4" },
              ],
              correctOptionId: "b",
            },
          ],
        }}
        enrollmentId={""}
        courseRecordId={""}
        courseSlug={""}
        scope={"MODULE"}
        onPass={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "4" }));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/Submission failed/i)).toBeDefined();
  });

  it("allows taking the evaluation again after a failed preview attempt", () => {
    render(
      <EvaluationRunner
        evaluation={{
          id: "",
          title: "Preview Evaluation",
          passingScore: 100,
          questions: [
            {
              id: "1",
              prompt: "What is 2 + 2?",
              options: [
                { id: "a", text: "3" },
                { id: "b", text: "4" },
              ],
              correctOptionId: "b",
            },
          ],
        }}
        enrollmentId={""}
        courseRecordId={""}
        courseSlug={""}
        scope={"MODULE"}
        previewMode
        onPass={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(screen.getByText(/Failed/i)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /retake/i }));

    expect(screen.getByText(/What is 2 \+ 2\?/i)).toBeDefined();
    expect(screen.queryByText(/Failed/i)).toBeNull();
  });
});
