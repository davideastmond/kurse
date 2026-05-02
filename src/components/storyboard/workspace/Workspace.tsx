"use client";

import { useEffect, useMemo, useState } from "react";

import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import { StoryboardBuilder } from "@/app/utils/storyboard-builder/story-board-builder";
import LessonCanvas, {
  type LessonCanvasEditableValues,
} from "@/components/storyboard/lesson-canvas/Lesson-canvas";
import ToolBar from "@/components/storyboard/toolbar/ToolBar";

type BlockType =
  ApiCoursePayload["modules"][number]["lessons"][number]["blocks"][number]["type"];

type WorkspaceProps = {
  initialCourse: ApiCoursePayload;
};

type SelectionType = "MODULE" | "LESSON" | "BLOCK";

type StoryboardSelection = {
  type: SelectionType;
  moduleId: string;
  lessonId?: string;
  blockId?: string;
};

function isSameSelection(
  a: StoryboardSelection | null,
  b: StoryboardSelection | null,
) {
  if (a === b) {
    return true;
  }

  if (!a || !b) {
    return false;
  }

  return (
    a.type === b.type &&
    a.moduleId === b.moduleId &&
    a.lessonId === b.lessonId &&
    a.blockId === b.blockId
  );
}

export default function Workspace({ initialCourse }: WorkspaceProps) {
  const [selection, setSelection] = useState<StoryboardSelection | null>(null);
  const [lessonAttributeEdits, setLessonAttributeEdits] = useState<
    Record<string, LessonCanvasEditableValues>
  >({});

  const builderResult = useMemo(
    () => StoryboardBuilder.fromApi(initialCourse),
    [initialCourse],
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

  useEffect(() => {
    if (isSameSelection(selection, normalizedSelection)) {
      return;
    }

    setSelection(normalizedSelection);
  }, [normalizedSelection, selection]);

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

  const selectModule = (moduleId: string) => {
    setSelection({
      type: "MODULE",
      moduleId,
    });
  };

  const selectLesson = (moduleId: string, lessonId: string) => {
    setSelection({
      type: "LESSON",
      moduleId,
      lessonId,
    });
  };

  const selectBlock = (moduleId: string, lessonId: string, blockId: string) => {
    setSelection({
      type: "BLOCK",
      moduleId,
      lessonId,
      blockId,
    });
  };

  const handleAddLesson = () => {
    // TODO: Implement add lesson logic
    console.log("Add lesson clicked");
  };

  const handleAddModule = () => {
    // TODO: Implement add module logic
    console.log("Add module clicked");
  };

  const handleAddBlock = (blockType: BlockType) => {
    // TODO: Implement add block logic with proper block creation
    console.log("Add block clicked:", blockType);
  };

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
              <section
                key={moduleItem.id}
                className={`space-y-4 rounded-3xl border p-3 transition-all ${
                  selectedModuleId === moduleItem.id
                    ? "border-sky-200 bg-white/80 ring-2 ring-sky-100 shadow-[0_16px_40px_rgba(14,165,233,0.12)]"
                    : "border-transparent"
                }`}
              >
                <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Module
                      {selectedModuleId === moduleItem.id ? (
                        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] tracking-[0.12em] text-sky-700">
                          Selected
                        </span>
                      ) : null}
                    </p>
                    <h2
                      className="cursor-pointer text-2xl font-semibold tracking-tight text-slate-900 transition-colors hover:text-sky-700"
                      onClick={() => {
                        selectModule(moduleItem.id);
                      }}
                    >
                      {moduleItem.title}
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {moduleItem.progressLabel ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                        {moduleItem.progressLabel}
                      </span>
                    ) : null}
                    {moduleItem.evaluationTitle ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold">
                        {moduleItem.evaluationTitle}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-5">
                  {moduleItem.lessons.map((lessonItem) => (
                    <div
                      key={lessonItem.id}
                      className="rounded-4xl"
                      onClick={() => {
                        selectLesson(moduleItem.id, lessonItem.id);
                      }}
                    >
                      <LessonCanvas
                        id={lessonItem.id}
                        isSelected={selectedLessonId === lessonItem.id}
                        title={
                          lessonAttributeEdits[lessonItem.id]?.title ??
                          lessonItem.title
                        }
                        duration={
                          lessonAttributeEdits[lessonItem.id]?.duration ??
                          lessonItem.duration
                        }
                        objective={
                          lessonAttributeEdits[lessonItem.id]?.objective ??
                          lessonItem.objective
                        }
                        blocks={lessonItem.blocks}
                        selectedBlockId={selectedBlockId}
                        onCanvasClick={() => {
                          selectLesson(moduleItem.id, lessonItem.id);
                        }}
                        onBlockClick={(block) => {
                          selectBlock(moduleItem.id, lessonItem.id, block.id);
                        }}
                        onLessonAttributesChange={(values) => {
                          setLessonAttributeEdits((current) => ({
                            ...current,
                            [lessonItem.id]: {
                              ...current[lessonItem.id],
                              ...values,
                            },
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="h-fit rounded-4xl border border-slate-200 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:flex xl:h-full xl:min-h-0 xl:flex-col">
            <div className="shrink-0">
              <ToolBar
                onAddModule={handleAddModule}
                onAddLesson={handleAddLesson}
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

              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Block Detail
              </p>
              {selectedBlock ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-slate-950">
                      {selectedBlock.title}
                    </h3>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
                      {selectedBlock.type}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    {selectedBlock.detail}
                  </p>
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Expanded media or editor view can mount here.
                  </div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    Duration: {selectedBlock.duration}
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm leading-6 text-slate-500">
                  Select a block from any lesson canvas to inspect a larger
                  detail view.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
