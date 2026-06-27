// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ToolBar from "./ToolBar";

afterEach(() => {
  cleanup();
});

describe("ToolBar", () => {
  it("renders core actions", () => {
    render(<ToolBar />);

    expect(
      screen.getByRole("button", { name: "Add a new module" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add a new lesson" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Add video block" }),
    ).toBeTruthy();
  });

  it("calls module and lesson callbacks", () => {
    const onAddModule = vi.fn();
    const onAddLesson = vi.fn();

    render(<ToolBar onAddModule={onAddModule} onAddLesson={onAddLesson} />);

    fireEvent.click(screen.getByRole("button", { name: "Add a new module" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a new lesson" }));

    expect(onAddModule).toHaveBeenCalledTimes(1);
    expect(onAddLesson).toHaveBeenCalledTimes(1);
  });

  it("calls onAddBlock with block type", () => {
    const onAddBlock = vi.fn();

    render(<ToolBar onAddBlock={onAddBlock} />);

    fireEvent.click(screen.getByRole("button", { name: "Add video block" }));

    expect(onAddBlock).toHaveBeenCalledWith("video");
  });

  it("calls evaluation callbacks", () => {
    const onAddModuleEvaluation = vi.fn();
    const onAddCourseEvaluation = vi.fn();

    render(
      <ToolBar
        onAddModuleEvaluation={onAddModuleEvaluation}
        onAddCourseEvaluation={onAddCourseEvaluation}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Add a module evaluation" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Add a course evaluation" }),
    );

    expect(onAddModuleEvaluation).toHaveBeenCalledTimes(1);
    expect(onAddCourseEvaluation).toHaveBeenCalledTimes(1);
  });

  it("disables all actions in read-only mode", () => {
    render(<ToolBar readOnly />);

    const moduleButton = screen.getByRole("button", {
      name: "Add a new module",
    });
    const videoButton = screen.getByRole("button", { name: "Add video block" });
    const moduleEvaluationButton = screen.getByRole("button", {
      name: "Add a module evaluation",
    });

    expect(moduleButton.hasAttribute("disabled")).toBe(true);
    expect(videoButton.hasAttribute("disabled")).toBe(true);
    expect(moduleEvaluationButton.hasAttribute("disabled")).toBe(true);
  });

  it("respects capability flags", () => {
    render(
      <ToolBar
        canAddBlock={false}
        canAddModuleEvaluation={false}
        canAddCourseEvaluation={false}
      />,
    );

    expect(
      screen
        .getByRole("button", { name: "Add video block" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Add a module evaluation" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Add a course evaluation" })
        .hasAttribute("disabled"),
    ).toBe(true);

    expect(
      screen
        .getByRole("button", { name: "Add a new module" })
        .hasAttribute("disabled"),
    ).toBe(false);
    expect(
      screen
        .getByRole("button", { name: "Add a new lesson" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});
