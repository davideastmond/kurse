"use client";

import { saveCourseStoryboard } from "@/app/actions/courses";
import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { StoryboardBuilder } from "@/app/utils/storyboard-builder/story-board-builder";
import BlockDetailRenderer from "@/components/storyboard/blocks/Block-detail-renderer";
import type { LessonCanvasEditableValues } from "@/components/storyboard/lesson-canvas/Lesson-canvas";
import ModuleSection from "@/components/storyboard/module-section/Module-section";
import ToolBar from "@/components/storyboard/toolbar/ToolBar";
import type {
  StoryboardBlock,
  StoryboardBlockType,
} from "@/shared/types/storyboard";
import { useCallback, useMemo, useRef, useState } from "react";

type WorkspaceProps = {
  initialCourse: ApiCoursePayload;
  courseRecordId: string;
};

type SelectionType = "MODULE" | "LESSON" | "BLOCK";

type StoryboardSelection = {
  type: SelectionType;
  moduleId: string;
  lessonId?: string;
  blockId?: string;
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

function createEntityId(prefix: "module" | "lesson" | "block") {
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
  };
}

export default function Workspace({
  initialCourse,
  courseRecordId,
}: WorkspaceProps) {
  const [workingCourse, setWorkingCourse] =
    useState<ApiCoursePayload>(initialCourse);
  const [selection, setSelection] = useState<StoryboardSelection | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const workingCourseRef = useRef<ApiCoursePayload>(initialCourse);
  const latestSavedVersionRef = useRef<number>(initialCourse.version);
  const pendingSaveRef = useRef<ApiCoursePayload | null>(null);
  const isSavingRef = useRef(false);
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
        saveBlockedRef.current = true;
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
      if (saveBlockedRef.current) {
        return;
      }

      pendingSaveRef.current = nextCourse;
      void persistLatestCourse();
    },
    [persistLatestCourse],
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
  }, [renderModel, selection]);

  const selectedModuleId = normalizedSelection?.moduleId;
  const selectedLessonId = normalizedSelection?.lessonId;
  const selectedBlockId = normalizedSelection?.blockId;

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
      const result = mutator(workingCourseRef.current);

      workingCourseRef.current = result.nextCourse;
      setWorkingCourse(result.nextCourse);
      queueSave(result.nextCourse);

      if (typeof result.nextSelection !== "undefined") {
        setSelection(result.nextSelection);
      }
    },
    [queueSave],
  );

  const selectModule = useCallback((moduleId: string) => {
    setSelection({
      type: "MODULE",
      moduleId,
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

  const handleAddModule = useCallback(() => {
    applyCourseMutation((current) => {
      const nextModuleId = createEntityId("module");
      const nextModule = {
        id: nextModuleId,
        title: "New Module",
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
        const nextLesson = {
          id: nextLessonId,
          title: "New Lesson",
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
      const moduleId = selectedModuleId ?? workingCourse.modules[0]?.id;

      if (!moduleId) {
        return;
      }

      const moduleItem = workingCourse.modules.find(
        (candidate) => candidate.id === moduleId,
      );

      if (!moduleItem) {
        return;
      }

      const lessonId = selectedLessonId ?? moduleItem.lessons[0]?.id;

      if (!lessonId) {
        return;
      }

      addBlockToLesson(moduleId, lessonId, blockType);
    },
    [
      addBlockToLesson,
      selectedLessonId,
      selectedModuleId,
      workingCourse.modules,
    ],
  );

  if (!builderResult.ok || !renderModel) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm">
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_52%,#f8fafc_100%)] p-6 xl:h-screen xl:overflow-hidden">
      <div className="mx-auto flex h-full max-w-7xl flex-col">
        <header className="mb-6 shrink-0 rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                Storyboard Workspace
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
                {renderModel.course.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {renderModel.course.synopsis}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 font-medium">
                {renderModel.modules.length} modules
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 font-medium">
                {lessonCount} lessons
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-2 font-medium">
                {renderModel.course.estimatedDuration}
              </span>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 overflow-hidden xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6 xl:min-h-0 xl:overflow-y-auto xl:pr-2">
            {renderModel.modules.map((moduleItem) => (
              <ModuleSection
                key={moduleItem.id}
                moduleItem={moduleItem}
                selectedModuleId={selectedModuleId}
                selectedLessonId={selectedLessonId}
                selectedBlockId={selectedBlockId}
                onSelectModule={selectModule}
                onSelectLesson={selectLesson}
                onSelectBlock={selectBlock}
                onLessonAttributesChange={handleLessonAttributesChange}
                onAddLesson={handleAddLesson}
                onAddBlock={addBlockToLesson}
              />
            ))}
          </div>

          <aside className="h-fit rounded-4xl border border-slate-200 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:flex xl:h-full xl:min-h-0 xl:flex-col">
            <div className="shrink-0">
              <ToolBar
                onAddModule={handleAddModule}
                onAddLesson={() => {
                  handleAddLesson();
                }}
                onAddBlock={handleAddBlock}
              />
            </div>

            <div className="mt-5 border-t border-slate-200/80 pt-5 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600">
                <p className="font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Current Selection
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

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600">
                <p className="font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Save Status
                </p>
                {saveState.status === "saving" ? (
                  <p className="mt-2 text-sky-700">Saving changes...</p>
                ) : null}
                {saveState.status === "idle" ? (
                  <p className="mt-2 text-emerald-700">All changes saved.</p>
                ) : null}
                {saveState.status === "error" ? (
                  <p className="mt-2 text-red-700">
                    {saveState.message ?? "Unable to save your changes."}
                  </p>
                ) : null}
              </div>

              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Block Detail
              </p>
              <BlockDetailRenderer
                block={selectedBlock}
                onUpdateBlock={handleUpdateBlock}
                moduleId={selectedModuleId}
                lessonId={selectedLessonId}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
