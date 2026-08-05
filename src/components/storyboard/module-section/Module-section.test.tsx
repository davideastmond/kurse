// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModuleSectionProps } from "./definitions";
import ModuleSection from "./Module-section";

vi.mock("@/components/storyboard/lesson-canvas/Lesson-canvas", () => ({
  default: ({
    id,
    title,
    onCanvasClick,
    onDeleteLesson,
    onMoveLessonUp,
    onMoveLessonDown,
  }: {
    id?: string;
    title: string;
    onCanvasClick?: () => void;
    onDeleteLesson?: () => void;
    onMoveLessonUp?: () => void;
    onMoveLessonDown?: () => void;
  }) => (
    <div data-testid={`lesson-${id ?? title}`}>
      <button type="button" onClick={onCanvasClick}>
        {title}
      </button>
      {onDeleteLesson ? (
        <button type="button" onClick={onDeleteLesson}>
          Delete lesson {title}
        </button>
      ) : null}
      {onMoveLessonUp ? (
        <button type="button" onClick={onMoveLessonUp}>
          Move lesson {title} up
        </button>
      ) : null}
      {onMoveLessonDown ? (
        <button type="button" onClick={onMoveLessonDown}>
          Move lesson {title} down
        </button>
      ) : null}
    </div>
  ),
}));

vi.mock(
  "@/components/storyboard/module-evaluation/Module-evaluation-canvas",
  () => ({
    default: () => <div>Mock module evaluation</div>,
  }),
);

function createLesson(
  overrides: Partial<ModuleSectionProps["moduleItem"]["lessons"][number]> = {},
) {
  return {
    id: "lesson-1",
    title: "Lesson 1",
    duration: "10 min",
    objective: "Learn the basics",
    blocks: [],
    ...overrides,
  };
}

function createModule(
  overrides: Partial<ModuleSectionProps["moduleItem"]> = {},
): ModuleSectionProps["moduleItem"] {
  return {
    id: "module-1",
    title: "Getting Started",
    lessons: [],
    ...overrides,
  };
}

function createProps(
  overrides: Partial<ModuleSectionProps> = {},
): ModuleSectionProps {
  return {
    moduleItem: createModule(),
    moduleIndex: 0,
    moduleCount: 3,
    readOnly: false,
    selectedModuleId: undefined,
    selectedLessonId: undefined,
    selectedBlockId: undefined,
    onDeleteModule: vi.fn(),
    onSelectModule: vi.fn(),
    onSelectLesson: vi.fn(),
    onSelectBlock: vi.fn(),
    onLessonAttributesChange: vi.fn(),
    onModuleTitleChange: vi.fn(),
    onMoveModule: vi.fn(),
    onMoveLesson: vi.fn(),
    onAddLesson: vi.fn(),
    onDeleteLesson: vi.fn(),
    onAddBlock: vi.fn(),
    onMoveBlock: vi.fn(),
    onDeleteBlocks: vi.fn(),
    onUpdateModuleEvaluation: vi.fn(),
    onDeleteModuleEvaluation: vi.fn(),
    ...overrides,
  };
}

describe("ModuleSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Title Editing", () => {
    it("allows editing the module title", () => {
      const props = createProps();

      render(<ModuleSection {...props} />);

      fireEvent.click(screen.getByRole("button", { name: "Rename" }));

      const input = screen.getByRole("textbox", { name: "Module title" });
      expect((input as HTMLInputElement).value).toBe("Getting Started");

      fireEvent.change(input, { target: { value: "Advanced Topics" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(props.onSelectModule).toHaveBeenCalledWith("module-1");
      expect(props.onModuleTitleChange).toHaveBeenCalledWith(
        "module-1",
        "Advanced Topics",
      );
    });

    it("does not submit an empty module title", () => {
      const props = createProps();

      render(<ModuleSection {...props} />);

      fireEvent.click(screen.getByRole("button", { name: "Rename" }));

      const input = screen.getByRole("textbox", { name: "Module title" });
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(props.onModuleTitleChange).not.toHaveBeenCalled();
      expect(
        screen.queryByRole("textbox", { name: "Module title" }),
      ).toBeNull();
    });
  });

  describe("Pending Delete", () => {
    it("shows a confirmation dialog when deleting a module", () => {
      const props = createProps();

      render(<ModuleSection {...props} />);

      fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

      const dialog = screen.getByRole("dialog");

      expect(dialog).toBeTruthy();
      expect(props.onDeleteModule).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

      expect(props.onDeleteModule).toHaveBeenCalledWith("module-1");
    });

    it("confirms lesson deletion through the dialog", () => {
      const props = createProps({
        moduleItem: createModule({
          lessons: [createLesson()],
        }),
      });

      render(<ModuleSection {...props} />);

      fireEvent.click(
        screen.getByRole("button", { name: "Delete lesson Lesson 1" }),
      );

      const dialog = screen.getByRole("dialog");

      expect(dialog).toBeTruthy();
      expect(props.onDeleteLesson).not.toHaveBeenCalled();

      fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

      expect(props.onDeleteLesson).toHaveBeenCalledWith("module-1", "lesson-1");
    });
  });

  describe("Lesson Management", () => {
    it("allows adding lessons", () => {
      const props = createProps();

      render(<ModuleSection {...props} />);

      fireEvent.click(screen.getByRole("button", { name: "Add Lesson" }));

      expect(props.onAddLesson).toHaveBeenCalledWith("module-1");
    });

    it("wires lesson move callbacks", () => {
      const props = createProps({
        moduleItem: createModule({
          lessons: [
            createLesson(),
            createLesson({ id: "lesson-2", title: "Lesson 2" }),
          ],
        }),
      });

      render(<ModuleSection {...props} />);

      fireEvent.click(
        screen.getByRole("button", { name: "Move lesson Lesson 2 up" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Move lesson Lesson 1 down" }),
      );

      expect(props.onMoveLesson).toHaveBeenNthCalledWith(
        1,
        "module-1",
        "lesson-2",
        "up",
      );
      expect(props.onMoveLesson).toHaveBeenNthCalledWith(
        2,
        "module-1",
        "lesson-1",
        "down",
      );
    });
  });
});
