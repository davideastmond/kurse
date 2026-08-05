// @vitest-environment jsdom

import type { CourseRunnerCourse } from "@/components/course-runner/definitions";
import type { StoryboardLesson } from "@/shared/types/storyboard";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RunnerSidebar from "./Runner-sidebar";

const mockCourse: CourseRunnerCourse = {
  id: "course-1",
  title: "Test Course",
  slug: "test-course",
  synopsis: "",
  estimatedDuration: "2h",
  welcomeImages: [],
  courseEvaluation: undefined,
  modules: [
    {
      id: "module-1",
      title: "Module 1",
      lessons: [],
      evaluation: undefined,
    },
  ],
};

const mockLessons: Array<{
  moduleId: string;
  moduleTitle: string;
  lesson: StoryboardLesson;
  index: number;
}> = [
  {
    moduleId: "module-1",
    moduleTitle: "Module 1",
    lesson: {
      id: "lesson-1",
      title: "First Lesson",
      duration: "5m",
      objective: "",
      blocks: [],
    },
    index: 0,
  },
];

describe("RunnerSidebar rendering", () => {
  it("renders the sidebar with course title and progress bar", () => {
    const { container, getByText } = render(
      <RunnerSidebar
        course={mockCourse}
        lessons={mockLessons}
        selectedLessonId={null}
        selectedModuleEvalId={null}
        courseEvalSelected={false}
        unlockedLessonIds={new Set(["lesson-1"])}
        completedLessonIds={new Set()}
        unlockedModuleEvalIds={new Set()}
        passedModuleEvalIds={new Set()}
        courseEvalUnlocked={false}
        courseEvalPassed={false}
        progressPercent={0}
        onSelectLesson={() => {}}
        onSelectModuleEval={() => {}}
        onSelectCourseEval={() => {}}
      />,
    );

    expect(getByText("Test Course")).toBeDefined();
    expect(container.querySelector(".bg-primary")).toBeDefined();
  });

  it("renders a selected lesson with primary background", () => {
    const { container } = render(
      <RunnerSidebar
        course={mockCourse}
        lessons={mockLessons}
        selectedLessonId="lesson-1"
        selectedModuleEvalId={null}
        courseEvalSelected={false}
        unlockedLessonIds={new Set(["lesson-1"])}
        completedLessonIds={new Set()}
        unlockedModuleEvalIds={new Set()}
        passedModuleEvalIds={new Set()}
        courseEvalUnlocked={false}
        courseEvalPassed={false}
        progressPercent={0}
        onSelectLesson={() => {}}
        onSelectModuleEval={() => {}}
        onSelectCourseEval={() => {}}
      />,
    );

    const selectedButton = container.querySelector(
      "button.bg-primary.text-primary-foreground",
    );
    expect(selectedButton).toBeDefined();
    expect(selectedButton?.textContent).toContain("First Lesson");
  });

  it("renders an unlocked lesson with muted background", () => {
    const { container } = render(
      <RunnerSidebar
        course={mockCourse}
        lessons={mockLessons}
        selectedLessonId={null}
        selectedModuleEvalId={null}
        courseEvalSelected={false}
        unlockedLessonIds={new Set(["lesson-1"])}
        completedLessonIds={new Set()}
        unlockedModuleEvalIds={new Set()}
        passedModuleEvalIds={new Set()}
        courseEvalUnlocked={false}
        courseEvalPassed={false}
        progressPercent={0}
        onSelectLesson={() => {}}
        onSelectModuleEval={() => {}}
        onSelectCourseEval={() => {}}
      />,
    );

    const unlockedButton = container.querySelector(
      "button.bg-muted\\/40.text-foreground",
    );
    expect(unlockedButton).toBeDefined();
    expect(unlockedButton?.textContent).toContain("Open");
  });

  it("renders a locked lesson with lock emoji", () => {
    const mockLessonsLocked: Array<{
      moduleId: string;
      moduleTitle: string;
      lesson: StoryboardLesson;
      index: number;
    }> = [
      {
        moduleId: "module-1",
        moduleTitle: "Module 1",
        lesson: {
          id: "lesson-2",
          title: "Locked Lesson",
          duration: "5m",
          objective: "",
          blocks: [],
        },
        index: 0,
      },
    ];

    const { container } = render(
      <RunnerSidebar
        course={mockCourse}
        lessons={mockLessonsLocked}
        selectedLessonId={null}
        selectedModuleEvalId={null}
        courseEvalSelected={false}
        unlockedLessonIds={new Set()}
        completedLessonIds={new Set()}
        unlockedModuleEvalIds={new Set()}
        passedModuleEvalIds={new Set()}
        courseEvalUnlocked={false}
        courseEvalPassed={false}
        progressPercent={0}
        onSelectLesson={() => {}}
        onSelectModuleEval={() => {}}
        onSelectCourseEval={() => {}}
      />,
    );

    const lockedButton = container.querySelector(
      "button.bg-muted\\/40.text-foreground",
    );
    expect(lockedButton).toBeDefined();
    expect(lockedButton?.textContent).toContain("🔒");
  });

  it("renders a completed lesson with checkmark", () => {
    const mockLessonsCompleted: Array<{
      moduleId: string;
      moduleTitle: string;
      lesson: StoryboardLesson;
      index: number;
    }> = [
      {
        moduleId: "module-1",
        moduleTitle: "Module 1",
        lesson: {
          id: "lesson-3",
          title: "Completed Lesson",
          duration: "5m",
          objective: "",
          blocks: [],
        },
        index: 0,
      },
    ];

    const { container } = render(
      <RunnerSidebar
        course={mockCourse}
        lessons={mockLessonsCompleted}
        selectedLessonId={null}
        selectedModuleEvalId={null}
        courseEvalSelected={false}
        unlockedLessonIds={new Set(["lesson-3"])}
        completedLessonIds={new Set(["lesson-3"])}
        unlockedModuleEvalIds={new Set()}
        passedModuleEvalIds={new Set()}
        courseEvalUnlocked={false}
        courseEvalPassed={false}
        progressPercent={0}
        onSelectLesson={() => {}}
        onSelectModuleEval={() => {}}
        onSelectCourseEval={() => {}}
      />,
    );

    const completedButton = container.querySelector(
      "button.bg-muted\\/40.text-foreground",
    );
    expect(completedButton).toBeDefined();
    expect(completedButton?.textContent).toContain("✓");
  });
});
