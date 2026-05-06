import type {
  CourseStatus,
  StoryboardBlockType,
} from "@/shared/types/storyboard";
import { BLOCK_TYPES } from "@/shared/types/storyboard";
import {
  ApiCoursePayload,
  BuilderResult,
  CourseStructureJsonb,
  StoryboardRenderBlock,
  StoryboardRenderLesson,
  StoryboardRenderModel,
  StoryboardRenderModule,
  StoryboardValidationError,
} from "./definitions";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isKnownStatus(value: unknown): value is CourseStatus {
  return value === "DRAFT" || value === "PUBLISHED" || value === "ARCHIVED";
}

function isKnownBlockType(value: unknown): value is StoryboardBlockType {
  return (BLOCK_TYPES as readonly unknown[]).includes(value);
}

function isValidRichtextFontSize(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 9 &&
    value <= 72
  );
}

function cloneJsonValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);

    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nestedValue);
    }
  }

  return value;
}

function validatePayload(
  payload: ApiCoursePayload,
): StoryboardValidationError[] {
  const errors: StoryboardValidationError[] = [];
  const moduleIds = new Set<string>();
  const lessonIds = new Set<string>();
  const blockIds = new Set<string>();

  const pushInvalidField = (path: string, message: string) => {
    errors.push({
      code: "INVALID_FIELD",
      path,
      message,
    });
  };

  const pushDuplicate = (path: string, message: string) => {
    errors.push({
      code: "DUPLICATE_ID",
      path,
      message,
    });
  };

  if (!isNonEmptyString(payload.id)) {
    pushInvalidField("course.id", "course id is required.");
  }

  if (!isNonEmptyString(payload.title)) {
    pushInvalidField("course.title", "course title is required.");
  }

  if (!isNonEmptyString(payload.slug)) {
    pushInvalidField("course.slug", "course slug is required.");
  }

  if (!isKnownStatus(payload.status)) {
    pushInvalidField(
      "course.status",
      "course status must be DRAFT, PUBLISHED, or ARCHIVED.",
    );
  }

  if (!Number.isInteger(payload.version) || payload.version < 1) {
    pushInvalidField(
      "course.version",
      "course version must be an integer greater than 0.",
    );
  }

  if (!Array.isArray(payload.modules)) {
    pushInvalidField("course.modules", "course modules must be an array.");
    return errors;
  }

  if (payload.courseEvaluation !== undefined) {
    const ev = payload.courseEvaluation;
    const evalPath = "course.courseEvaluation";

    if (!isNonEmptyString(ev.id)) {
      pushInvalidField(`${evalPath}.id`, "evaluation id is required.");
    }

    if (!isNonEmptyString(ev.title)) {
      pushInvalidField(`${evalPath}.title`, "evaluation title is required.");
    }

    if (
      !Number.isInteger(ev.passingScore) ||
      ev.passingScore < 0 ||
      ev.passingScore > 100
    ) {
      pushInvalidField(
        `${evalPath}.passingScore`,
        "evaluation passing score must be an integer 0–100.",
      );
    }

    if (!Array.isArray(ev.questions)) {
      pushInvalidField(
        `${evalPath}.questions`,
        "evaluation questions must be an array.",
      );
    }
  }

  payload.modules.forEach((moduleItem, moduleIndex) => {
    const modulePath = `course.modules[${moduleIndex}]`;

    if (!isNonEmptyString(moduleItem.id)) {
      pushInvalidField(`${modulePath}.id`, "module id is required.");
    } else if (moduleIds.has(moduleItem.id)) {
      pushDuplicate(
        `${modulePath}.id`,
        `duplicate module id: ${moduleItem.id}`,
      );
    } else {
      moduleIds.add(moduleItem.id);
    }

    if (!isNonEmptyString(moduleItem.title)) {
      pushInvalidField(`${modulePath}.title`, "module title is required.");
    }

    if (moduleItem.evaluation !== undefined) {
      const ev = moduleItem.evaluation;
      const evalPath = `${modulePath}.evaluation`;

      if (!isNonEmptyString(ev.id)) {
        pushInvalidField(`${evalPath}.id`, "evaluation id is required.");
      }

      if (!isNonEmptyString(ev.title)) {
        pushInvalidField(`${evalPath}.title`, "evaluation title is required.");
      }

      if (
        !Number.isInteger(ev.passingScore) ||
        ev.passingScore < 0 ||
        ev.passingScore > 100
      ) {
        pushInvalidField(
          `${evalPath}.passingScore`,
          "evaluation passing score must be an integer 0–100.",
        );
      }

      if (!Array.isArray(ev.questions)) {
        pushInvalidField(
          `${evalPath}.questions`,
          "evaluation questions must be an array.",
        );
      }
    }

    if (!Array.isArray(moduleItem.lessons)) {
      pushInvalidField(
        `${modulePath}.lessons`,
        "module lessons must be an array.",
      );
      return;
    }

    moduleItem.lessons.forEach((lessonItem, lessonIndex) => {
      const lessonPath = `${modulePath}.lessons[${lessonIndex}]`;

      if (!isNonEmptyString(lessonItem.id)) {
        pushInvalidField(`${lessonPath}.id`, "lesson id is required.");
      } else if (lessonIds.has(lessonItem.id)) {
        pushDuplicate(
          `${lessonPath}.id`,
          `duplicate lesson id: ${lessonItem.id}`,
        );
      } else {
        lessonIds.add(lessonItem.id);
      }

      if (!isNonEmptyString(lessonItem.title)) {
        pushInvalidField(`${lessonPath}.title`, "lesson title is required.");
      }

      if (!Array.isArray(lessonItem.blocks)) {
        pushInvalidField(
          `${lessonPath}.blocks`,
          "lesson blocks must be an array.",
        );
        return;
      }

      lessonItem.blocks.forEach((blockItem, blockIndex) => {
        const blockPath = `${lessonPath}.blocks[${blockIndex}]`;

        if (!isNonEmptyString(blockItem.id)) {
          pushInvalidField(`${blockPath}.id`, "block id is required.");
        } else if (blockIds.has(blockItem.id)) {
          pushDuplicate(
            `${blockPath}.id`,
            `duplicate block id: ${blockItem.id}`,
          );
        } else {
          blockIds.add(blockItem.id);
        }

        if (!isNonEmptyString(blockItem.title)) {
          pushInvalidField(`${blockPath}.title`, "block title is required.");
        }

        if (!isKnownBlockType(blockItem.type)) {
          pushInvalidField(
            `${blockPath}.type`,
            `block type must be one of: ${BLOCK_TYPES.join(", ")}.`,
          );
        }

        if (!isNonEmptyString(blockItem.detail)) {
          pushInvalidField(`${blockPath}.detail`, "block detail is required.");
        }

        if (!isNonEmptyString(blockItem.duration)) {
          pushInvalidField(
            `${blockPath}.duration`,
            "block duration is required.",
          );
        }

        if (
          typeof blockItem.fontSizePx !== "undefined" &&
          !isValidRichtextFontSize(blockItem.fontSizePx)
        ) {
          pushInvalidField(
            `${blockPath}.fontSizePx`,
            "font size must be an integer between 9 and 72.",
          );
        }
      });
    });
  });

  return errors;
}

function buildStructureFromPayload(
  payload: ApiCoursePayload,
): CourseStructureJsonb {
  const structure: CourseStructureJsonb = {
    schemaVersion: 1,
    course: {
      id: payload.id,
      title: payload.title,
      slug: payload.slug,
      status: payload.status,
      version: payload.version,
      synopsis: payload.synopsis,
      audience: payload.audience,
      estimatedDuration: payload.estimatedDuration,
      courseEvaluation: payload.courseEvaluation,
    },
    moduleOrder: [],
    lessonOrderByModule: {},
    blockOrderByLesson: {},
    modulesById: {},
    lessonsById: {},
    blocksById: {},
  };

  for (const moduleItem of payload.modules) {
    structure.moduleOrder.push(moduleItem.id);
    structure.lessonOrderByModule[moduleItem.id] = [];
    structure.modulesById[moduleItem.id] = {
      id: moduleItem.id,
      title: moduleItem.title,
      progressLabel: moduleItem.progressLabel,
      evaluationTitle: moduleItem.evaluationTitle,
    };

    if (moduleItem.evaluation !== undefined) {
      structure.modulesById[moduleItem.id]!.evaluation = moduleItem.evaluation;
    }

    for (const lessonItem of moduleItem.lessons) {
      structure.lessonOrderByModule[moduleItem.id].push(lessonItem.id);
      structure.blockOrderByLesson[lessonItem.id] = [];
      structure.lessonsById[lessonItem.id] = {
        id: lessonItem.id,
        moduleId: moduleItem.id,
        title: lessonItem.title,
        duration: lessonItem.duration,
        objective: lessonItem.objective,
      };

      for (const blockItem of lessonItem.blocks) {
        structure.blockOrderByLesson[lessonItem.id].push(blockItem.id);
        structure.blocksById[blockItem.id] = {
          id: blockItem.id,
          lessonId: lessonItem.id,
          type: blockItem.type,
          title: blockItem.title,
          detail: blockItem.detail,
          duration: blockItem.duration,
          fontSizePx: blockItem.fontSizePx,
          videoUrl: blockItem.videoUrl,
          imageUrl: blockItem.imageUrl,
          audioUrl: blockItem.audioUrl,
          quiz: blockItem.quiz,
        };
      }
    }
  }

  return structure;
}

function buildApiPayloadFromStructure(
  structure: CourseStructureJsonb,
): ApiCoursePayload {
  return {
    ...structure.course,
    modules: structure.moduleOrder.map((moduleId) => {
      const moduleEntity = structure.modulesById[moduleId];

      return {
        id: moduleEntity.id,
        title: moduleEntity.title,
        progressLabel: moduleEntity.progressLabel,
        evaluationTitle: moduleEntity.evaluationTitle,
        evaluation: moduleEntity.evaluation,
        lessons: (structure.lessonOrderByModule[moduleId] ?? []).map(
          (lessonId) => {
            const lessonEntity = structure.lessonsById[lessonId];

            return {
              id: lessonEntity.id,
              title: lessonEntity.title,
              duration: lessonEntity.duration,
              objective: lessonEntity.objective,
              blocks: (structure.blockOrderByLesson[lessonId] ?? []).map(
                (blockId) => {
                  const blockEntity = structure.blocksById[blockId];

                  return {
                    id: blockEntity.id,
                    type: blockEntity.type,
                    title: blockEntity.title,
                    detail: blockEntity.detail,
                    duration: blockEntity.duration,
                    fontSizePx: blockEntity.fontSizePx,
                    videoUrl: blockEntity.videoUrl,
                    imageUrl: blockEntity.imageUrl,
                    audioUrl: blockEntity.audioUrl,
                    quiz: blockEntity.quiz,
                  };
                },
              ),
            };
          },
        ),
      };
    }),
  };
}

export class StoryboardBuilder {
  private readonly structure: CourseStructureJsonb;

  private constructor(structure: CourseStructureJsonb) {
    this.structure = deepFreeze(cloneJsonValue(structure));
  }

  static fromApi(payload: ApiCoursePayload): BuilderResult<StoryboardBuilder> {
    const validationErrors = validatePayload(payload);

    if (validationErrors.length > 0) {
      return {
        ok: false,
        errors: validationErrors,
      };
    }

    const normalizedStructure = buildStructureFromPayload(payload);

    return {
      ok: true,
      value: new StoryboardBuilder(normalizedStructure),
      errors: [],
    };
  }

  toJSONB(): CourseStructureJsonb {
    return cloneJsonValue(this.structure);
  }

  toRenderModel(): StoryboardRenderModel {
    const modules: StoryboardRenderModule[] = this.structure.moduleOrder.map(
      (moduleId) => {
        const moduleEntity = this.structure.modulesById[moduleId];

        const lessons: StoryboardRenderLesson[] = (
          this.structure.lessonOrderByModule[moduleId] ?? []
        ).map((lessonId) => {
          const lessonEntity = this.structure.lessonsById[lessonId];
          const blocks: StoryboardRenderBlock[] = (
            this.structure.blockOrderByLesson[lessonId] ?? []
          ).map((blockId) => this.structure.blocksById[blockId]);

          return {
            id: lessonEntity.id,
            title: lessonEntity.title,
            duration: lessonEntity.duration,
            objective: lessonEntity.objective,
            blocks,
          };
        });

        return {
          id: moduleEntity.id,
          title: moduleEntity.title,
          progressLabel: moduleEntity.progressLabel,
          evaluationTitle: moduleEntity.evaluationTitle,
          evaluation: moduleEntity.evaluation,
          lessons,
        };
      },
    );

    return {
      course: cloneJsonValue(this.structure.course),
      modules,
    };
  }

  toApiPayload(): ApiCoursePayload {
    return buildApiPayloadFromStructure(this.structure);
  }

  withVersion(version: number): BuilderResult<StoryboardBuilder> {
    if (!Number.isInteger(version) || version < 1) {
      return {
        ok: false,
        errors: [
          {
            code: "INVALID_FIELD",
            path: "course.version",
            message: "course version must be an integer greater than 0.",
          },
        ],
      };
    }

    const next = this.toJSONB();
    next.course.version = version;

    return {
      ok: true,
      value: new StoryboardBuilder(next),
      errors: [],
    };
  }
}
