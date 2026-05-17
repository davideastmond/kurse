import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { StoryboardBuilder } from "@/app/utils/storyboard-builder/story-board-builder";
import { describe, expect, it } from "vitest";
import {
  moveBlockInLesson,
  moveLessonInModule,
  moveModuleInCourse,
} from "./reorder";

function createFixture(): ApiCoursePayload {
  return {
    id: "course_1",
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
                type: "richtext",
                title: "Block 1",
                detail: "Detail 1",
                duration: "1 min",
              },
              {
                id: "b2",
                type: "richtext",
                title: "Block 2",
                detail: "Detail 2",
                duration: "1 min",
              },
              {
                id: "b3",
                type: "richtext",
                title: "Block 3",
                detail: "Detail 3",
                duration: "1 min",
              },
            ],
          },
          {
            id: "l2",
            title: "Lesson 2",
            duration: "5 min",
            objective: "",
            blocks: [],
          },
          {
            id: "l3",
            title: "Lesson 3",
            duration: "5 min",
            objective: "",
            blocks: [],
          },
        ],
      },
      {
        id: "m2",
        title: "Module 2",
        lessons: [],
      },
      {
        id: "m3",
        title: "Module 3",
        lessons: [],
      },
    ],
  };
}

function ids(values: { id: string }[]) {
  return values.map((value) => value.id);
}

describe("storyboard reorder utilities", () => {
  it("moves modules within course order and keeps a full ID set", () => {
    const fixture = createFixture();

    const moved = moveModuleInCourse(fixture, "m2", "up");

    expect(ids(moved.modules)).toEqual(["m2", "m1", "m3"]);
    expect(new Set(ids(moved.modules))).toEqual(new Set(ids(fixture.modules)));
  });

  it("does not move module beyond boundaries", () => {
    const fixture = createFixture();

    const unchanged = moveModuleInCourse(fixture, "m1", "up");

    expect(unchanged).toBe(fixture);
    expect(ids(unchanged.modules)).toEqual(["m1", "m2", "m3"]);
  });

  it("moves lessons within a module and preserves all lesson IDs", () => {
    const fixture = createFixture();

    const moved = moveLessonInModule(fixture, "m1", "l2", "up");
    const originalLessonIds = ids(fixture.modules[0].lessons);
    const movedLessonIds = ids(moved.modules[0].lessons);

    expect(movedLessonIds).toEqual(["l2", "l1", "l3"]);
    expect(new Set(movedLessonIds)).toEqual(new Set(originalLessonIds));
  });

  it("keeps lesson move as no-op when requested lesson is already first", () => {
    const fixture = createFixture();

    const unchanged = moveLessonInModule(fixture, "m1", "l1", "up");

    expect(unchanged).toBe(fixture);
    expect(ids(unchanged.modules[0].lessons)).toEqual(["l1", "l2", "l3"]);
  });

  it("moves blocks within a lesson while preserving block IDs", () => {
    const fixture = createFixture();

    const moved = moveBlockInLesson(fixture, "m1", "l1", "b2", "down");
    const originalBlockIds = ids(fixture.modules[0].lessons[0].blocks);
    const movedBlockIds = ids(moved.modules[0].lessons[0].blocks);

    expect(movedBlockIds).toEqual(["b1", "b3", "b2"]);
    expect(new Set(movedBlockIds)).toEqual(new Set(originalBlockIds));
  });

  it("keeps block move as no-op when already at boundary", () => {
    const fixture = createFixture();

    const unchanged = moveBlockInLesson(fixture, "m1", "l1", "b3", "down");

    expect(unchanged).toBe(fixture);
    expect(ids(unchanged.modules[0].lessons[0].blocks)).toEqual([
      "b1",
      "b2",
      "b3",
    ]);
  });

  it("keeps selection identity stable by retaining the same moved entity id", () => {
    const fixture = createFixture();

    const movedLesson = moveLessonInModule(fixture, "m1", "l2", "up");
    const movedBlock = moveBlockInLesson(fixture, "m1", "l1", "b2", "up");

    expect(ids(movedLesson.modules[0].lessons)).toContain("l2");
    expect(ids(movedBlock.modules[0].lessons[0].blocks)).toContain("b2");
  });

  it("preserves reordered structure through builder render and api round-trip", () => {
    const fixture = createFixture();

    const reordered = moveBlockInLesson(
      moveLessonInModule(
        moveModuleInCourse(fixture, "m2", "up"),
        "m1",
        "l2",
        "up",
      ),
      "m1",
      "l1",
      "b2",
      "down",
    );

    const buildResult = StoryboardBuilder.fromApi(reordered);
    expect(buildResult.ok).toBe(true);
    if (!buildResult.ok) {
      return;
    }

    const renderModel = buildResult.value.toRenderModel();
    expect(ids(renderModel.modules)).toEqual(["m2", "m1", "m3"]);
    expect(ids(renderModel.modules[1].lessons)).toEqual(["l2", "l1", "l3"]);
    expect(ids(renderModel.modules[1].lessons[1].blocks)).toEqual([
      "b1",
      "b3",
      "b2",
    ]);

    const apiRoundTrip = buildResult.value.toApiPayload();
    expect(ids(apiRoundTrip.modules)).toEqual(["m2", "m1", "m3"]);
    expect(ids(apiRoundTrip.modules[1].lessons)).toEqual(["l2", "l1", "l3"]);
    expect(ids(apiRoundTrip.modules[1].lessons[1].blocks)).toEqual([
      "b1",
      "b3",
      "b2",
    ]);
  });

  it("returns INVALID_FIELD when a welcome image is not an object", () => {
    const malformed = {
      ...createFixture(),
      welcomeImages: [null],
    } as unknown as ApiCoursePayload;

    const result = StoryboardBuilder.fromApi(malformed);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.errors).toContainEqual({
      code: "INVALID_FIELD",
      path: "course.welcomeImages[0]",
      message: "welcome image must be an object.",
    });
  });
});
