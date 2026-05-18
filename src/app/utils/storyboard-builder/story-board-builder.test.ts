import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { StoryboardBuilder } from "@/app/utils/storyboard-builder/story-board-builder";
import { describe, expect, it } from "vitest";

function createFixture(): ApiCoursePayload {
  return {
    id: "course_link_test",
    title: "Course",
    slug: "course",
    status: "DRAFT",
    version: 1,
    synopsis: "",
    audience: "",
    estimatedDuration: "",
    modules: [
      {
        id: "m1",
        title: "Module 1",
        lessons: [
          {
            id: "l1",
            title: "Lesson 1",
            duration: "5 min",
            objective: "",
            blocks: [
              {
                id: "b1",
                type: "link",
                title: "Reference Link",
                detail: "Read this first",
                duration: "1 min",
                linkUrl: "https://example.com/docs",
                linkLabel: "Open Docs",
                openInNewTab: true,
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("StoryboardBuilder link block validation", () => {
  it("accepts valid link blocks and preserves link fields on round-trip", () => {
    const fixture = createFixture();

    const result = StoryboardBuilder.fromApi(fixture);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const payload = result.value.toApiPayload();
    const block = payload.modules[0].lessons[0].blocks[0];

    expect(block.type).toBe("link");
    expect(block.linkUrl).toBe("https://example.com/docs");
    expect(block.linkLabel).toBe("Open Docs");
    expect(block.openInNewTab).toBe(true);
  });

  it("rejects non-http(s) URLs for link blocks", () => {
    const malformed = createFixture();
    malformed.modules[0].lessons[0].blocks[0] = {
      ...malformed.modules[0].lessons[0].blocks[0],
      linkUrl: "ftp://example.com/file",
    };

    const result = StoryboardBuilder.fromApi(malformed);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toContainEqual({
      code: "INVALID_FIELD",
      path: "course.modules[0].lessons[0].blocks[0].linkUrl",
      message: "link URL must be a valid http or https URL.",
    });
  });
});
