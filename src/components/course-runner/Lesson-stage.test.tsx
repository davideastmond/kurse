import type {
  StoryboardLesson,
  StoryboardModule,
} from "@/shared/types/storyboard";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LessonStage from "./Lesson-stage";

vi.mock("@/components/course-runner/Inline-quiz-runner", () => ({
  default: () => null,
}));

function createLessonWithLink(openInNewTab: boolean): StoryboardLesson {
  return {
    id: "lesson-1",
    title: "Lesson",
    duration: "5m",
    objective: "",
    blocks: [
      {
        id: "block-link-1",
        type: "link",
        title: "Resource",
        detail: "Use this resource",
        duration: "1m",
        linkUrl: "https://example.com/resource",
        linkLabel: "Open Resource",
        openInNewTab,
      },
    ],
  };
}

const moduleFixture: StoryboardModule = {
  id: "module-1",
  title: "Module",
  lessons: [],
};

describe("LessonStage link rendering", () => {
  it("renders link CTA with new-tab security attributes by default", () => {
    const lesson = createLessonWithLink(true);

    const html = renderToStaticMarkup(
      <LessonStage
        module={moduleFixture}
        lesson={lesson}
        canGoPrevious={false}
        canGoNext={true}
        nextLabel="Next"
        isSavingProgress={false}
        onPrevious={() => {}}
        onNext={() => {}}
        onInlineQuizGateChange={() => {}}
      />,
    );

    expect(html).toContain('href="https://example.com/resource"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("Open Resource");
  });

  it("omits target and rel when openInNewTab is false", () => {
    const lesson = createLessonWithLink(false);

    const html = renderToStaticMarkup(
      <LessonStage
        module={moduleFixture}
        lesson={lesson}
        canGoPrevious={false}
        canGoNext={true}
        nextLabel="Next"
        isSavingProgress={false}
        onPrevious={() => {}}
        onNext={() => {}}
        onInlineQuizGateChange={() => {}}
      />,
    );

    expect(html).toContain('href="https://example.com/resource"');
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain('rel="noopener noreferrer"');
  });
});
