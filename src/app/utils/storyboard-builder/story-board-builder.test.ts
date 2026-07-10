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

  it("requires linkUrl for link blocks", () => {
    const malformed = createFixture();
    malformed.modules[0].lessons[0].blocks[0] = {
      ...malformed.modules[0].lessons[0].blocks[0],
      linkUrl: "",
    };

    const result = StoryboardBuilder.fromApi(malformed);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toContainEqual({
      code: "INVALID_FIELD",
      path: "course.modules[0].lessons[0].blocks[0].linkUrl",
      message: "link URL is required for link blocks.",
    });
  });

  it("rejects non-string linkLabel values", () => {
    const malformed = createFixture();
    malformed.modules[0].lessons[0].blocks[0] = {
      ...malformed.modules[0].lessons[0].blocks[0],
      linkLabel: 123 as unknown as string,
    };

    const result = StoryboardBuilder.fromApi(malformed);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toContainEqual({
      code: "INVALID_FIELD",
      path: "course.modules[0].lessons[0].blocks[0].linkLabel",
      message: "link label must be a string when provided.",
    });
  });

  it("rejects non-boolean openInNewTab values", () => {
    const malformed = createFixture();
    malformed.modules[0].lessons[0].blocks[0] = {
      ...malformed.modules[0].lessons[0].blocks[0],
      openInNewTab: "yes" as unknown as boolean,
    };

    const result = StoryboardBuilder.fromApi(malformed);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toContainEqual({
      code: "INVALID_FIELD",
      path: "course.modules[0].lessons[0].blocks[0].openInNewTab",
      message: "openInNewTab must be a boolean when provided.",
    });
  });

  it("rejects non-string detail values for image blocks", () => {
    const malformed = createFixture();
    malformed.modules[0].lessons[0].blocks[0] = {
      ...malformed.modules[0].lessons[0].blocks[0],
      type: "image",
      detail: 42 as unknown as string,
    };

    const result = StoryboardBuilder.fromApi(malformed);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toContainEqual({
      code: "INVALID_FIELD",
      path: "course.modules[0].lessons[0].blocks[0].detail",
      message: "block detail must be a string when provided.",
    });
  });

  it("requires block duration", () => {
    const malformed = createFixture();
    malformed.modules[0].lessons[0].blocks[0] = {
      ...malformed.modules[0].lessons[0].blocks[0],
      duration: "",
    };

    const result = StoryboardBuilder.fromApi(malformed);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toContainEqual({
      code: "INVALID_FIELD",
      path: "course.modules[0].lessons[0].blocks[0].duration",
      message: "block duration is required.",
    });
  });

  it("rejects out-of-range richtext font sizes", () => {
    const malformed = createFixture();
    malformed.modules[0].lessons[0].blocks[0] = {
      ...malformed.modules[0].lessons[0].blocks[0],
      type: "richtext",
      fontSizePx: 100,
    };

    const result = StoryboardBuilder.fromApi(malformed);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toContainEqual({
      code: "INVALID_FIELD",
      path: "course.modules[0].lessons[0].blocks[0].fontSizePx",
      message: "font size must be an integer between 9 and 72.",
    });
  });
});

describe("StoryboardBuilder render and version behavior", () => {
  it("builds a render model from normalized structure", () => {
    const fixture = createFixture();
    fixture.modules[0].progressLabel = "1 of 1";
    fixture.modules[0].evaluationTitle = "Wrap-up";

    const result = StoryboardBuilder.fromApi(fixture);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const renderModel = result.value.toRenderModel();

    expect(renderModel.course.id).toBe("course_link_test");
    expect(renderModel.modules).toHaveLength(1);
    expect(renderModel.modules[0].id).toBe("m1");
    expect(renderModel.modules[0].progressLabel).toBe("1 of 1");
    expect(renderModel.modules[0].evaluationTitle).toBe("Wrap-up");
    expect(renderModel.modules[0].lessons).toHaveLength(1);
    expect(renderModel.modules[0].lessons[0].id).toBe("l1");
    expect(renderModel.modules[0].lessons[0].blocks).toHaveLength(1);
    expect(renderModel.modules[0].lessons[0].blocks[0].type).toBe("link");
  });

  it("preserves module evaluation in render and API models", () => {
    const fixture = createFixture();
    fixture.modules[0].evaluation = {
      id: "me1",
      title: "Module Checkpoint",
      passingScore: 80,
      questions: [],
    };

    const result = StoryboardBuilder.fromApi(fixture);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.toRenderModel().modules[0].evaluation).toEqual({
      id: "me1",
      title: "Module Checkpoint",
      passingScore: 80,
      questions: [],
    });
    expect(result.value.toApiPayload().modules[0].evaluation).toEqual({
      id: "me1",
      title: "Module Checkpoint",
      passingScore: 80,
      questions: [],
    });
  });

  it("returns validation errors for invalid version changes", () => {
    const result = StoryboardBuilder.fromApi(createFixture());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const invalid = result.value.withVersion(0);

    expect(invalid.ok).toBe(false);
    if (invalid.ok) {
      return;
    }

    expect(invalid.errors).toEqual([
      {
        code: "INVALID_FIELD",
        path: "course.version",
        message: "course version must be an integer greater than 0.",
      },
    ]);
  });

  it("creates a new builder with an updated version", () => {
    const result = StoryboardBuilder.fromApi(createFixture());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const next = result.value.withVersion(2);

    expect(next.ok).toBe(true);
    if (!next.ok) {
      return;
    }

    expect(next.value.toApiPayload().version).toBe(2);
    expect(result.value.toApiPayload().version).toBe(1);
  });

  it("returns defensive copies from toJSONB", () => {
    const result = StoryboardBuilder.fromApi(createFixture());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const snapshot = result.value.toJSONB();
    snapshot.course.version = 99;
    snapshot.modulesById.m1.title = "Mutated";

    const secondRead = result.value.toJSONB();
    expect(secondRead.course.version).toBe(1);
    expect(secondRead.modulesById.m1.title).toBe("Module 1");
  });
});
