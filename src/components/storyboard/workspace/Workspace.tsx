"use client";

import { saveCourseStoryboard } from "@/app/actions/courses";
import { uploadToS3 } from "@/app/actions/s3-uploader";
import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { StoryboardBuilder } from "@/app/utils/storyboard-builder/story-board-builder";
import PromptDialog from "@/components/dialogs/Prompt-dialog";
import BlockDetailRenderer from "@/components/storyboard/blocks/Block-detail-renderer";
import CourseEvaluationCanvas from "@/components/storyboard/course-evaluation/Course-evaluation-canvas";
import type { LessonCanvasEditableValues } from "@/components/storyboard/lesson-canvas/Lesson-canvas";
import ModuleSection from "@/components/storyboard/module-section/Module-section";
import ToolBar from "@/components/storyboard/toolbar/ToolBar";
import {
  moveBlockInLesson,
  moveLessonInModule,
  moveModuleInCourse,
} from "@/components/storyboard/workspace/reorder";
import { courseStatusEnum } from "@/db/schema";
import type {
  CourseEvaluation,
  ModuleEvaluation,
  StoryboardBlock,
  StoryboardBlockType,
  WelcomeScreenImage,
} from "@/shared/types/storyboard";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type WorkspaceProps = {
  initialCourse: ApiCoursePayload;
  courseRecordId: string;
  readOnly?: boolean;
};

type StoryboardSelection =
  | {
      type: "COURSE_EVALUATION";
    }
  | {
      type: "MODULE";
      moduleId: string;
    }
  | {
      type: "LESSON";
      moduleId: string;
      lessonId: string;
    }
  | {
      type: "BLOCK";
      moduleId: string;
      lessonId: string;
      blockId: string;
    };

type SaveState = {
  status: "idle" | "saving" | "error";
  message?: string;
};

const DEFAULT_BLOCK_TITLE: Record<StoryboardBlockType, string> = {
  video: "New Video",
  richtext: "New Text Block",
  image: "New Image",
  quiz_inline: "New Quiz",
  audio: "New Audio",
};

const COURSE_STATUS_OPTIONS = courseStatusEnum.enumValues;
const MAX_WELCOME_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

function createEntityId(
  prefix: "module" | "lesson" | "block" | "evaluation" | "welcome_image",
) {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  return `${prefix}_${randomPart}`;
}

function createNewBlock(blockType: StoryboardBlockType) {
  return {
    id: createEntityId("block"),
    type: blockType,
    title: DEFAULT_BLOCK_TITLE[blockType],
    detail: "Add details for this block.",
    duration: "5 min",
    fontSizePx: blockType === "richtext" ? 16 : undefined,
  };
}

export default function Workspace({
  initialCourse,
  courseRecordId,
  readOnly = false,
}: WorkspaceProps) {
  const [workingCourse, setWorkingCourse] =
    useState<ApiCoursePayload>(initialCourse);
  const [selection, setSelection] = useState<StoryboardSelection | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [isModulePromptOpen, setIsModulePromptOpen] = useState(false);
  const [isWelcomeImageUploading, setIsWelcomeImageUploading] = useState(false);
  const [welcomeImageError, setWelcomeImageError] = useState<string | null>(
    null,
  );
  const [isWelcomeImagesPanelOpen, setIsWelcomeImagesPanelOpen] =
    useState(false);
  const [pendingReplaceImageId, setPendingReplaceImageId] = useState<
    string | null
  >(null);

  const workingCourseRef = useRef<ApiCoursePayload>(initialCourse);
  const courseEvaluationRef = useRef<HTMLDivElement | null>(null);
  const welcomeImageInputRef = useRef<HTMLInputElement | null>(null);
  const latestSavedVersionRef = useRef<number>(initialCourse.version);
  const pendingSaveRef = useRef<ApiCoursePayload | null>(null);
  const isSavingRef = useRef(false);
  // Set to true after a VERSION_CONFLICT error. Prevents further autosaves
  // (which would all fail with the same stale expectedVersion) until the user
  // reloads the page to re-sync with the server copy.
  const saveBlockedRef = useRef(false);

  const persistLatestCourse = useCallback(async () => {
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;

    while (pendingSaveRef.current) {
      const snapshot = pendingSaveRef.current;
      pendingSaveRef.current = null;
      setSaveState({ status: "saving" });

      const expectedVersion = latestSavedVersionRef.current;

      const result = await saveCourseStoryboard({
        courseId: courseRecordId,
        expectedVersion,
        payload: {
          ...snapshot,
          version: expectedVersion,
        },
      });

      if (result.ok) {
        latestSavedVersionRef.current = result.version;
        setWorkingCourse((current) => {
          if (current.id !== snapshot.id) {
            return current;
          }

          const nextCourse = {
            ...current,
            version: result.version,
          };

          workingCourseRef.current = nextCourse;

          return nextCourse;
        });

        setSaveState({ status: "idle" });
      } else {
        pendingSaveRef.current = null;

        if (result.code === "VERSION_CONFLICT") {
          // A version conflict means the server copy has diverged from what
          // the client expects. Permanently block further autosaves so we
          // don't keep hammering the server with the stale expectedVersion.
          // The user must reload the page to resume editing.
          saveBlockedRef.current = true;
        }

        setSaveState({
          status: "error",
          message: result.message,
        });
        break;
      }
    }

    isSavingRef.current = false;
  }, [courseRecordId]);

  const queueSave = useCallback(
    (nextCourse: ApiCoursePayload) => {
      if (readOnly || saveBlockedRef.current) {
        return;
      }

      pendingSaveRef.current = nextCourse;
      void persistLatestCourse();
    },
    [persistLatestCourse, readOnly],
  );

  const builderResult = useMemo(
    () => StoryboardBuilder.fromApi(workingCourse),
    [workingCourse],
  );

  const renderModel = useMemo(() => {
    if (!builderResult.ok) {
      return null;
    }

    return builderResult.value.toRenderModel();
  }, [builderResult]);

  const normalizedSelection = useMemo(() => {
    if (!selection || !renderModel) {
      return null;
    }

    if (selection.type === "COURSE_EVALUATION") {
      if (!workingCourse.courseEvaluation) {
        return null;
      }

      return {
        type: "COURSE_EVALUATION" as const,
      };
    }

    const moduleItem = renderModel.modules.find(
      (candidate) => candidate.id === selection.moduleId,
    );

    if (!moduleItem) {
      return null;
    }

    if (selection.type === "MODULE") {
      return {
        type: "MODULE" as const,
        moduleId: moduleItem.id,
      };
    }

    if (!selection.lessonId) {
      return {
        type: "MODULE" as const,
        moduleId: moduleItem.id,
      };
    }

    const lessonItem = moduleItem.lessons.find(
      (candidate) => candidate.id === selection.lessonId,
    );

    if (!lessonItem) {
      return {
        type: "MODULE" as const,
        moduleId: moduleItem.id,
      };
    }

    if (selection.type === "LESSON") {
      return {
        type: "LESSON" as const,
        moduleId: moduleItem.id,
        lessonId: lessonItem.id,
      };
    }

    if (!selection.blockId) {
      return {
        type: "LESSON" as const,
        moduleId: moduleItem.id,
        lessonId: lessonItem.id,
      };
    }

    const blockItem = lessonItem.blocks.find(
      (candidate) => candidate.id === selection.blockId,
    );

    if (!blockItem) {
      return {
        type: "LESSON" as const,
        moduleId: moduleItem.id,
        lessonId: lessonItem.id,
      };
    }

    return {
      type: "BLOCK" as const,
      moduleId: moduleItem.id,
      lessonId: lessonItem.id,
      blockId: blockItem.id,
    };
  }, [renderModel, selection, workingCourse.courseEvaluation]);

  const selectedModuleId = normalizedSelection?.moduleId;
  const selectedLessonId = normalizedSelection?.lessonId;
  const selectedBlockId = normalizedSelection?.blockId;
  const isCourseEvaluationSelected =
    normalizedSelection?.type === "COURSE_EVALUATION";

  useEffect(() => {
    if (!isCourseEvaluationSelected) {
      return;
    }

    courseEvaluationRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [isCourseEvaluationSelected]);

  const selectedModule = useMemo(() => {
    if (!selectedModuleId || !renderModel) {
      return null;
    }

    return (
      renderModel.modules.find(
        (moduleItem) => moduleItem.id === selectedModuleId,
      ) ?? null
    );
  }, [renderModel, selectedModuleId]);

  const selectedLesson = useMemo(() => {
    if (!selectedModule || !selectedLessonId) {
      return null;
    }

    return (
      selectedModule.lessons.find(
        (lessonItem) => lessonItem.id === selectedLessonId,
      ) ?? null
    );
  }, [selectedLessonId, selectedModule]);

  const selectedBlock = useMemo(() => {
    if (!selectedLesson || !selectedBlockId) {
      return null;
    }

    return (
      selectedLesson.blocks.find(
        (blockItem) => blockItem.id === selectedBlockId,
      ) ?? null
    );
  }, [selectedBlockId, selectedLesson]);

  const applyCourseMutation = useCallback(
    (
      mutator: (current: ApiCoursePayload) => {
        nextCourse: ApiCoursePayload;
        nextSelection?: StoryboardSelection | null;
      },
    ) => {
      if (readOnly) {
        return;
      }

      const result = mutator(workingCourseRef.current);

      workingCourseRef.current = result.nextCourse;
      setWorkingCourse(result.nextCourse);
      queueSave(result.nextCourse);

      if (typeof result.nextSelection !== "undefined") {
        setSelection(result.nextSelection);
      }
    },
    [queueSave, readOnly],
  );

  const selectModule = useCallback((moduleId: string) => {
    setSelection({
      type: "MODULE",
      moduleId,
    });
  }, []);

  const selectCourseEvaluation = useCallback(() => {
    if (!workingCourseRef.current.courseEvaluation) {
      return;
    }

    setSelection({
      type: "COURSE_EVALUATION",
    });
  }, []);

  const selectLesson = useCallback((moduleId: string, lessonId: string) => {
    setSelection({
      type: "LESSON",
      moduleId,
      lessonId,
    });
  }, []);

  const selectBlock = useCallback(
    (moduleId: string, lessonId: string, blockId: string) => {
      setSelection({
        type: "BLOCK",
        moduleId,
        lessonId,
        blockId,
      });
    },
    [],
  );

  const handleLessonAttributesChange = useCallback(
    (lessonId: string, values: LessonCanvasEditableValues) => {
      applyCourseMutation((current) => {
        const nextModules = current.modules.map((moduleItem) => ({
          ...moduleItem,
          lessons: moduleItem.lessons.map((lessonItem) => {
            if (lessonItem.id !== lessonId) {
              return lessonItem;
            }

            return {
              ...lessonItem,
              title: values.title ?? lessonItem.title,
              objective: values.objective ?? lessonItem.objective,
              duration: values.duration ?? lessonItem.duration,
            };
          }),
        }));

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
        };
      });
    },
    [applyCourseMutation],
  );

  const handleModuleTitleChange = useCallback(
    (moduleId: string, title: string) => {
      applyCourseMutation((current) => {
        const nextModules = current.modules.map((moduleItem) => {
          if (moduleItem.id !== moduleId) {
            return moduleItem;
          }

          return {
            ...moduleItem,
            title,
          };
        });

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
        };
      });
    },
    [applyCourseMutation],
  );

  const handleUpdateBlock = useCallback(
    (
      moduleId: string,
      lessonId: string,
      blockId: string,
      patch: Partial<StoryboardBlock>,
    ) => {
      applyCourseMutation((current) => {
        const nextModules = current.modules.map((moduleItem) => {
          if (moduleItem.id !== moduleId) {
            return moduleItem;
          }

          return {
            ...moduleItem,
            lessons: moduleItem.lessons.map((lessonItem) => {
              if (lessonItem.id !== lessonId) {
                return lessonItem;
              }

              return {
                ...lessonItem,
                blocks: lessonItem.blocks.map((blockItem) => {
                  if (blockItem.id !== blockId) {
                    return blockItem;
                  }

                  return {
                    ...blockItem,
                    ...patch,
                  };
                }),
              };
            }),
          };
        });

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
        };
      });
    },
    [applyCourseMutation],
  );

  const handleAddModule = useCallback(
    (requestedTitle?: string) => {
      applyCourseMutation((current) => {
        const nextModuleId = createEntityId("module");
        const sanitizedTitle = requestedTitle?.trim();
        const nextModule = {
          id: nextModuleId,
          title: sanitizedTitle || "New Module",
          progressLabel: "0%",
          evaluationTitle: undefined,
          lessons: [],
        };

        return {
          nextCourse: {
            ...current,
            modules: [...current.modules, nextModule],
          },
          nextSelection: {
            type: "MODULE",
            moduleId: nextModuleId,
          },
        };
      });
    },
    [applyCourseMutation],
  );

  const handleDeleteModule = useCallback(
    (moduleId: string) => {
      applyCourseMutation((current) => {
        const moduleIndex = current.modules.findIndex(
          (moduleItem) => moduleItem.id === moduleId,
        );

        if (moduleIndex === -1) {
          return { nextCourse: current };
        }

        const nextModules = current.modules.filter(
          (moduleItem) => moduleItem.id !== moduleId,
        );

        const shouldShiftSelection =
          normalizedSelection?.type !== "COURSE_EVALUATION" &&
          normalizedSelection?.moduleId === moduleId;

        if (!shouldShiftSelection) {
          return {
            nextCourse: {
              ...current,
              modules: nextModules,
            },
          };
        }

        const fallbackModule =
          nextModules[moduleIndex] ?? nextModules[moduleIndex - 1];

        if (!fallbackModule) {
          return {
            nextCourse: {
              ...current,
              modules: nextModules,
            },
            nextSelection: null,
          };
        }

        const fallbackLessonId = fallbackModule.lessons[0]?.id;

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
          nextSelection: fallbackLessonId
            ? {
                type: "LESSON",
                moduleId: fallbackModule.id,
                lessonId: fallbackLessonId,
              }
            : {
                type: "MODULE",
                moduleId: fallbackModule.id,
              },
        };
      });
    },
    [applyCourseMutation, normalizedSelection],
  );

  const handleMoveModule = useCallback(
    (moduleId: string, direction: "up" | "down") => {
      applyCourseMutation((current) => {
        const nextCourse = moveModuleInCourse(current, moduleId, direction);
        if (nextCourse === current) {
          return { nextCourse: current };
        }

        return {
          nextCourse,
        };
      });
    },
    [applyCourseMutation],
  );

  const handleDeleteLesson = useCallback(
    (moduleId: string, lessonId: string) => {
      applyCourseMutation((current) => {
        const targetModule = current.modules.find(
          (moduleItem) => moduleItem.id === moduleId,
        );

        if (!targetModule) {
          return { nextCourse: current };
        }

        const nextModules = current.modules.map((moduleItem) => {
          if (moduleItem.id !== moduleId) {
            return moduleItem;
          }

          return {
            ...moduleItem,
            lessons: moduleItem.lessons.filter(
              (lessonItem) => lessonItem.id !== lessonId,
            ),
          };
        });

        const wasSelected =
          (normalizedSelection?.type === "LESSON" ||
            normalizedSelection?.type === "BLOCK") &&
          normalizedSelection.lessonId === lessonId;

        if (!wasSelected) {
          return {
            nextCourse: {
              ...current,
              modules: nextModules,
            },
          };
        }

        const lessonIndex =
          targetModule?.lessons.findIndex((l) => l.id === lessonId) ?? -1;
        const remainingLessons =
          targetModule?.lessons.filter((l) => l.id !== lessonId) ?? [];
        const fallbackLesson =
          remainingLessons[lessonIndex] ?? remainingLessons[lessonIndex - 1];

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
          nextSelection: fallbackLesson
            ? {
                type: "LESSON" as const,
                moduleId,
                lessonId: fallbackLesson.id,
              }
            : {
                type: "MODULE" as const,
                moduleId,
              },
        };
      });
    },
    [applyCourseMutation, normalizedSelection],
  );

  const requestModuleCreation = useCallback(() => {
    setIsModulePromptOpen(true);
  }, []);

  const requestModuleEvaluationCreation = useCallback(() => {
    if (!selectedModuleId || !selectedModule || selectedModule.evaluation) {
      return;
    }

    const moduleId = selectedModuleId;

    applyCourseMutation((current) => {
      const nextModules = current.modules.map((moduleItem) => {
        if (moduleItem.id !== moduleId || moduleItem.evaluation) {
          return moduleItem;
        }

        return {
          ...moduleItem,
          evaluation: {
            id: createEntityId("evaluation"),
            title: "Module Evaluation",
            passingScore: 70,
            questions: [],
          },
        };
      });

      return {
        nextCourse: {
          ...current,
          modules: nextModules,
        },
        nextSelection: {
          type: "MODULE",
          moduleId,
        },
      };
    });
  }, [applyCourseMutation, selectedModule, selectedModuleId]);

  const handleUpdateModuleEvaluation = useCallback(
    (moduleId: string, evaluation: ModuleEvaluation) => {
      applyCourseMutation((current) => {
        const nextModules = current.modules.map((moduleItem) => {
          if (moduleItem.id !== moduleId) {
            return moduleItem;
          }

          return {
            ...moduleItem,
            evaluation,
          };
        });

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
        };
      });
    },
    [applyCourseMutation],
  );

  const handleDeleteModuleEvaluation = useCallback(
    (moduleId: string) => {
      applyCourseMutation((current) => {
        const nextModules = current.modules.map((moduleItem) => {
          if (moduleItem.id !== moduleId) {
            return moduleItem;
          }

          return {
            ...moduleItem,
            evaluation: undefined,
          };
        });

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
          nextSelection: {
            type: "MODULE",
            moduleId,
          },
        };
      });
    },
    [applyCourseMutation],
  );

  const requestCourseEvaluationCreation = useCallback(() => {
    if (workingCourseRef.current.courseEvaluation) {
      return;
    }

    applyCourseMutation((current) => {
      return {
        nextCourse: {
          ...current,
          courseEvaluation: {
            id: createEntityId("evaluation"),
            title: "Course Evaluation",
            passingScore: 70,
            questions: [],
          },
        },
        nextSelection: {
          type: "COURSE_EVALUATION",
        },
      };
    });
  }, [applyCourseMutation]);

  const handleUpdateCourseEvaluation = useCallback(
    (evaluation: CourseEvaluation) => {
      applyCourseMutation((current) => ({
        nextCourse: {
          ...current,
          courseEvaluation: evaluation,
        },
      }));
    },
    [applyCourseMutation],
  );

  const handleDeleteCourseEvaluation = useCallback(() => {
    applyCourseMutation((current) => ({
      nextCourse: {
        ...current,
        courseEvaluation: undefined,
      },
      nextSelection: null,
    }));
  }, [applyCourseMutation]);

  const handleAddLesson = useCallback(
    (targetModuleId?: string) => {
      const fallbackModuleId = workingCourse.modules[0]?.id;
      const moduleId = targetModuleId ?? selectedModuleId ?? fallbackModuleId;

      if (!moduleId) {
        return;
      }

      applyCourseMutation((current) => {
        const nextLessonId = createEntityId("lesson");
        const targetModule = current.modules.find(
          (moduleItem) => moduleItem.id === moduleId,
        );
        const mostRecentLesson = targetModule?.lessons.at(-1);
        const inheritedTitle = mostRecentLesson?.title?.trim();
        const nextLesson = {
          id: nextLessonId,
          title: inheritedTitle || "New Lesson",
          duration: "10 min",
          objective: "",
          blocks: [],
        };

        const nextModules = current.modules.map((moduleItem) => {
          if (moduleItem.id !== moduleId) {
            return moduleItem;
          }

          return {
            ...moduleItem,
            lessons: [...moduleItem.lessons, nextLesson],
          };
        });

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
          nextSelection: {
            type: "LESSON",
            moduleId,
            lessonId: nextLessonId,
          },
        };
      });
    },
    [applyCourseMutation, selectedModuleId, workingCourse.modules],
  );

  const handleMoveLesson = useCallback(
    (moduleId: string, lessonId: string, direction: "up" | "down") => {
      applyCourseMutation((current) => {
        const nextCourse = moveLessonInModule(
          current,
          moduleId,
          lessonId,
          direction,
        );
        if (nextCourse === current) {
          return { nextCourse: current };
        }

        return {
          nextCourse,
        };
      });
    },
    [applyCourseMutation],
  );

  const addBlockToLesson = useCallback(
    (moduleId: string, lessonId: string, blockType: StoryboardBlockType) => {
      applyCourseMutation((current) => {
        const nextBlock = createNewBlock(blockType);

        const nextModules = current.modules.map((moduleItem) => {
          if (moduleItem.id !== moduleId) {
            return moduleItem;
          }

          return {
            ...moduleItem,
            lessons: moduleItem.lessons.map((lessonItem) => {
              if (lessonItem.id !== lessonId) {
                return lessonItem;
              }

              return {
                ...lessonItem,
                blocks: [...lessonItem.blocks, nextBlock],
              };
            }),
          };
        });

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
          nextSelection: {
            type: "BLOCK",
            moduleId,
            lessonId,
            blockId: nextBlock.id,
          },
        };
      });
    },
    [applyCourseMutation],
  );

  const handleAddBlock = useCallback(
    (blockType: StoryboardBlockType) => {
      if (!selectedModuleId || !selectedLessonId) {
        return;
      }

      addBlockToLesson(selectedModuleId, selectedLessonId, blockType);
    },
    [addBlockToLesson, selectedLessonId, selectedModuleId],
  );

  const handleDeleteBlocks = useCallback(
    (moduleId: string, lessonId: string, blockIds: string[]) => {
      if (blockIds.length === 0) {
        return;
      }

      const blockIdSet = new Set(blockIds);

      applyCourseMutation((current) => {
        const nextModules = current.modules.map((moduleItem) => {
          if (moduleItem.id !== moduleId) {
            return moduleItem;
          }

          return {
            ...moduleItem,
            lessons: moduleItem.lessons.map((lessonItem) => {
              if (lessonItem.id !== lessonId) {
                return lessonItem;
              }

              return {
                ...lessonItem,
                // Filter preserves the relative order of remaining blocks.
                blocks: lessonItem.blocks.filter(
                  (blockItem) => !blockIdSet.has(blockItem.id),
                ),
              };
            }),
          };
        });

        return {
          nextCourse: {
            ...current,
            modules: nextModules,
          },
          nextSelection: {
            type: "LESSON",
            moduleId,
            lessonId,
          },
        };
      });
    },
    [applyCourseMutation],
  );

  const handleMoveBlock = useCallback(
    (
      moduleId: string,
      lessonId: string,
      blockId: string,
      direction: "up" | "down",
    ) => {
      applyCourseMutation((current) => {
        const nextCourse = moveBlockInLesson(
          current,
          moduleId,
          lessonId,
          blockId,
          direction,
        );
        if (nextCourse === current) {
          return { nextCourse: current };
        }

        return {
          nextCourse,
        };
      });
    },
    [applyCourseMutation],
  );

  const handleCourseStatusChange = useCallback(
    (nextStatus: ApiCoursePayload["status"]) => {
      if (readOnly) {
        return;
      }

      applyCourseMutation((current) => ({
        nextCourse: {
          ...current,
          status: nextStatus,
        },
      }));
    },
    [applyCourseMutation, readOnly],
  );

  const triggerWelcomeImagePicker = useCallback(
    (replaceImageId?: string) => {
      if (readOnly || isWelcomeImageUploading) {
        return;
      }

      setPendingReplaceImageId(replaceImageId ?? null);
      setWelcomeImageError(null);
      welcomeImageInputRef.current?.click();
    },
    [isWelcomeImageUploading, readOnly],
  );

  const handleWelcomeImageInputChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (file.size > MAX_WELCOME_IMAGE_SIZE_BYTES) {
        setWelcomeImageError("Image must be 2MB or smaller.");
        event.target.value = "";
        return;
      }

      if (!file.type.startsWith("image/")) {
        setWelcomeImageError(
          "Only image files can be added to welcome screen.",
        );
        event.target.value = "";
        return;
      }

      setWelcomeImageError(null);
      setIsWelcomeImageUploading(true);

      const replaceImageId = pendingReplaceImageId;
      const formData = new FormData();
      formData.set("file", file);

      const result = await uploadToS3(formData);

      if ("error" in result) {
        setWelcomeImageError(result.error);
        setIsWelcomeImageUploading(false);
        setPendingReplaceImageId(null);
        event.target.value = "";
        return;
      }

      applyCourseMutation((current) => {
        const currentWelcomeImages = current.welcomeImages ?? [];

        let nextWelcomeImages: WelcomeScreenImage[];

        if (replaceImageId) {
          nextWelcomeImages = currentWelcomeImages.map((imageItem) => {
            if (imageItem.id !== replaceImageId) {
              return imageItem;
            }

            return {
              ...imageItem,
              url: result.url,
            };
          });
        } else {
          nextWelcomeImages = [
            ...currentWelcomeImages,
            {
              id: createEntityId("welcome_image"),
              url: result.url,
              altText: "",
            },
          ];
        }

        return {
          nextCourse: {
            ...current,
            welcomeImages: nextWelcomeImages,
          },
        };
      });

      setIsWelcomeImageUploading(false);
      setPendingReplaceImageId(null);
      event.target.value = "";
    },
    [applyCourseMutation, pendingReplaceImageId],
  );

  const handleWelcomeImageAltTextChange = useCallback(
    (imageId: string, altText: string) => {
      applyCourseMutation((current) => {
        const currentWelcomeImages = current.welcomeImages ?? [];

        return {
          nextCourse: {
            ...current,
            welcomeImages: currentWelcomeImages.map((imageItem) => {
              if (imageItem.id !== imageId) {
                return imageItem;
              }

              return {
                ...imageItem,
                altText,
              };
            }),
          },
        };
      });
    },
    [applyCourseMutation],
  );

  const handleDeleteWelcomeImage = useCallback(
    (imageId: string) => {
      if (readOnly) {
        return;
      }

      const confirmed = window.confirm(
        "Remove this image from the welcome screen?",
      );

      if (!confirmed) {
        return;
      }

      applyCourseMutation((current) => {
        const currentWelcomeImages = current.welcomeImages ?? [];

        return {
          nextCourse: {
            ...current,
            welcomeImages: currentWelcomeImages.filter(
              (imageItem) => imageItem.id !== imageId,
            ),
          },
        };
      });
    },
    [applyCourseMutation, readOnly],
  );

  if (!builderResult.ok || !renderModel) {
    return (
      <div className="min-h-screen bg-muted p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-danger/40 bg-danger/15 p-6 text-danger shadow-sm">
          <h1 className="text-xl font-semibold">
            Storyboard configuration error
          </h1>
          <ul className="mt-4 space-y-2 text-sm">
            {builderResult.errors.map((error) => (
              <li key={`${error.path}-${error.code}`}>
                {error.path}: {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const lessonCount = renderModel.modules.reduce(
    (count, moduleItem) => count + moduleItem.lessons.length,
    0,
  );
  const canAddBlock = Boolean(selectedModule && selectedLesson);
  const canAddModuleEvaluation = Boolean(
    selectedModule && !selectedModule.evaluation,
  );
  const canAddCourseEvaluation = !workingCourse.courseEvaluation;

  return (
    <div className="min-h-screen bg-background p-6 xl:h-screen xl:overflow-hidden">
      <div className="mx-auto flex h-full max-w-7xl flex-col">
        <header className="mb-6 shrink-0 rounded-4xl border border-border/70 bg-surface/80 p-6 shadow-sm backdrop-blur">
          <input
            ref={welcomeImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={readOnly || isWelcomeImageUploading}
            onChange={(event) => {
              void handleWelcomeImageInputChange(event);
            }}
          />

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                Storyboard Workspace
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
                {renderModel.course.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {renderModel.course.synopsis}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Status
                <select
                  value={workingCourse.status}
                  disabled={readOnly}
                  onChange={(event) => {
                    const nextStatus = event.target
                      .value as ApiCoursePayload["status"];

                    if (
                      COURSE_STATUS_OPTIONS.includes(
                        nextStatus as (typeof COURSE_STATUS_OPTIONS)[number],
                      )
                    ) {
                      handleCourseStatusChange(nextStatus);
                    }
                  }}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground outline-none ring-primary focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label="Course status"
                >
                  {COURSE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <span className="rounded-full border border-border bg-surface px-4 py-2 font-medium">
                {renderModel.modules.length} modules
              </span>
              <span className="rounded-full border border-border bg-surface px-4 py-2 font-medium">
                {lessonCount} lessons
              </span>
              <span className="rounded-full border border-border bg-surface px-4 py-2 font-medium">
                {renderModel.course.estimatedDuration}
              </span>
            </div>
          </div>

          <div className="mt-5 border-t border-border/80 pt-5">
            <div className="rounded-2xl border border-border bg-muted/70 p-3 text-xs text-muted-foreground">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Welcome Screen Images
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setIsWelcomeImagesPanelOpen((current) => !current)
                    }
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-muted xl:hidden"
                    aria-expanded={isWelcomeImagesPanelOpen}
                    aria-label="Toggle welcome screen images panel"
                  >
                    {isWelcomeImagesPanelOpen ? "Hide" : "Show"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => triggerWelcomeImagePicker()}
                  disabled={readOnly || isWelcomeImageUploading}
                  className="rounded-lg border border-border bg-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add Image
                </button>
              </div>

              <div
                className={`${isWelcomeImagesPanelOpen ? "mt-2 block" : "hidden"} xl:mt-2 xl:block`}
              >
                {isWelcomeImageUploading ? (
                  <p className="mt-2 text-sky-700">Uploading image...</p>
                ) : null}

                {welcomeImageError ? (
                  <p className="mt-2 text-danger">{welcomeImageError}</p>
                ) : null}

                {workingCourse.welcomeImages &&
                workingCourse.welcomeImages.length > 0 ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {workingCourse.welcomeImages.map((imageItem) => (
                      <div
                        key={imageItem.id}
                        className="rounded-xl border border-border bg-surface p-2"
                      >
                        <Image
                          src={imageItem.url}
                          alt={imageItem.altText?.trim() || "Welcome image"}
                          width={1200}
                          height={800}
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="h-28 w-full rounded-lg object-cover"
                        />

                        <label className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Alt text
                        </label>
                        <input
                          type="text"
                          value={imageItem.altText ?? ""}
                          disabled={readOnly}
                          placeholder="Describe this image"
                          onChange={(event) => {
                            handleWelcomeImageAltTextChange(
                              imageItem.id,
                              event.target.value,
                            );
                          }}
                          className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
                        />

                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              triggerWelcomeImagePicker(imageItem.id)
                            }
                            disabled={readOnly || isWelcomeImageUploading}
                            className="flex-1 rounded-md border border-border bg-muted px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteWelcomeImage(imageItem.id)
                            }
                            disabled={readOnly || isWelcomeImageUploading}
                            className="flex-1 rounded-md border border-danger/40 bg-danger/10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2">
                    No welcome images yet. Add one or more images to customize
                    the learner intro screen.
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 overflow-hidden xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6 xl:min-h-0 xl:overflow-y-auto xl:pr-2">
            {workingCourse.courseEvaluation ? (
              <div ref={courseEvaluationRef}>
                <CourseEvaluationCanvas
                  evaluation={workingCourse.courseEvaluation}
                  isSelected={isCourseEvaluationSelected}
                  readOnly={readOnly}
                  onSelect={selectCourseEvaluation}
                  onUpdate={handleUpdateCourseEvaluation}
                  onDelete={handleDeleteCourseEvaluation}
                />
              </div>
            ) : null}

            {renderModel.modules.map((moduleItem, moduleIndex) => (
              <ModuleSection
                key={moduleItem.id}
                moduleItem={moduleItem}
                moduleIndex={moduleIndex}
                moduleCount={renderModel.modules.length}
                readOnly={readOnly}
                selectedModuleId={selectedModuleId}
                selectedLessonId={selectedLessonId}
                selectedBlockId={selectedBlockId}
                onDeleteModule={handleDeleteModule}
                onSelectModule={selectModule}
                onSelectLesson={selectLesson}
                onSelectBlock={selectBlock}
                onModuleTitleChange={handleModuleTitleChange}
                onMoveModule={handleMoveModule}
                onLessonAttributesChange={handleLessonAttributesChange}
                onMoveLesson={handleMoveLesson}
                onAddLesson={handleAddLesson}
                onDeleteLesson={handleDeleteLesson}
                onAddBlock={addBlockToLesson}
                onMoveBlock={handleMoveBlock}
                onDeleteBlocks={handleDeleteBlocks}
                onUpdateModuleEvaluation={handleUpdateModuleEvaluation}
                onDeleteModuleEvaluation={handleDeleteModuleEvaluation}
              />
            ))}
          </div>

          <aside className="h-fit rounded-4xl border border-border bg-surface/90 p-5 shadow-sm backdrop-blur xl:flex xl:h-full xl:min-h-0 xl:flex-col">
            <div className="shrink-0">
              <ToolBar
                onAddModule={requestModuleCreation}
                onAddLesson={() => {
                  handleAddLesson();
                }}
                onAddBlock={handleAddBlock}
                onAddModuleEvaluation={requestModuleEvaluationCreation}
                onAddCourseEvaluation={requestCourseEvaluationCreation}
                readOnly={readOnly}
                canAddBlock={canAddBlock}
                canAddModuleEvaluation={canAddModuleEvaluation}
                canAddCourseEvaluation={canAddCourseEvaluation}
              />
            </div>

            <div className="mt-5 border-t border-border/80 pt-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
              <div className="rounded-2xl border border-border bg-muted/70 p-3 text-xs text-muted-foreground">
                <p className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Current Selection
                </p>
                <p className="mt-2 truncate">
                  Course Evaluation:{" "}
                  {isCourseEvaluationSelected ? "Selected" : "None"}
                </p>
                <p className="mt-2 truncate">
                  Module: {selectedModule?.title ?? "None"}
                </p>
                <p className="mt-1 truncate">
                  Lesson: {selectedLesson?.title ?? "None"}
                </p>
                <p className="mt-1 truncate">
                  Block: {selectedBlock?.title ?? "None"}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-muted/70 p-3 text-xs text-muted-foreground">
                {workingCourse.courseEvaluation ? (
                  <button
                    type="button"
                    onClick={selectCourseEvaluation}
                    className="mb-3 w-full rounded-lg border border-violet-300/70 bg-violet-100/80 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-violet-900 transition-colors hover:bg-violet-200/80 dark:border-violet-500/50 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-900/45"
                  >
                    Jump To Course Evaluation
                  </button>
                ) : null}

                <p className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Save Status
                </p>
                {readOnly ? (
                  <p className="mt-2 text-sky-700">
                    View-only mode. You can inspect this storyboard but not edit
                    it.
                  </p>
                ) : null}
                {saveState.status === "saving" ? (
                  <p className="mt-2 text-sky-700">Saving changes...</p>
                ) : null}
                {saveState.status === "idle" && !readOnly ? (
                  <p className="mt-2 text-emerald-700">All changes saved.</p>
                ) : null}
                {saveState.status === "error" ? (
                  <p className="mt-2 text-danger">
                    {saveState.message ?? "Unable to save your changes."}
                  </p>
                ) : null}
              </div>

              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Block Detail
              </p>
              <BlockDetailRenderer
                block={selectedBlock}
                onUpdateBlock={readOnly ? undefined : handleUpdateBlock}
                moduleId={selectedModuleId}
                lessonId={selectedLessonId}
              />

              {selectedBlock &&
              selectedModuleId &&
              selectedLessonId &&
              !readOnly ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteBlocks(selectedModuleId, selectedLessonId, [
                      selectedBlock.id,
                    ]);
                  }}
                  className="mt-4 w-full rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-danger transition-colors hover:bg-danger/20"
                >
                  Delete Highlighted Block
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      {isModulePromptOpen ? (
        <PromptDialog
          label="Module name"
          defaultValue="New Module"
          confirmLabel="Create"
          onConfirm={(value) => {
            setIsModulePromptOpen(false);
            handleAddModule(value);
          }}
          onCancel={() => setIsModulePromptOpen(false)}
        />
      ) : null}
    </div>
  );
}
