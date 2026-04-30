"use client";

import { useMemo, useState } from "react";

import {
  StoryboardBuilder,
  type ApiCoursePayload,
} from "@/app/utils/storyboard-builder/story-board-builder";
import LessonCanvas, {
  type LessonCanvasEditableValues,
} from "@/components/storyboard/lesson-canvas/Lesson-canvas";
import ToolBar from "@/components/storyboard/toolbar/ToolBar";

type BlockType =
  ApiCoursePayload["modules"][number]["lessons"][number]["blocks"][number]["type"];

type WorkspaceProps = {
  initialCourse: ApiCoursePayload;
};

export default function Workspace({ initialCourse }: WorkspaceProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string>();
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

  const selectedBlock = useMemo(() => {
    if (!selectedBlockId || !renderModel) {
      return null;
    }

    for (const moduleItem of renderModel.modules) {
      for (const lessonItem of moduleItem.lessons) {
        const match = lessonItem.blocks.find(
          (block) => block.id === selectedBlockId,
        );

        if (match) {
          return match;
        }
      }
    }

    return null;
  }, [renderModel, selectedBlockId]);

  const handleAddLesson = () => {
    // TODO: Implement add lesson logic
    console.log("Add lesson clicked");
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_35%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_52%,#f8fafc_100%)] p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 rounded-4xl border border-white/70 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
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
        <div className="mb-6">
          <ToolBar onAddLesson={handleAddLesson} onAddBlock={handleAddBlock} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            {renderModel.modules.map((moduleItem) => (
              <section key={moduleItem.id} className="space-y-4">
                <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Module
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
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
                    <LessonCanvas
                      key={lessonItem.id}
                      id={lessonItem.id}
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
                      onBlockClick={(block) => {
                        setSelectedBlockId(block.id);
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
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="h-fit rounded-4xl border border-slate-200 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur xl:sticky xl:top-6">
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
                Select a block from any lesson canvas to inspect a larger detail
                view.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
