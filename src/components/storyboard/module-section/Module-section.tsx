"use client";

import LessonCanvas from "@/components/storyboard/lesson-canvas/Lesson-canvas";
import type { ModuleSectionProps } from "@/components/storyboard/module-section/definitions";
import { useState } from "react";

export default function ModuleSection({
  moduleItem,
  selectedModuleId,
  selectedLessonId,
  selectedBlockId,
  onSelectModule,
  onSelectLesson,
  onSelectBlock,
  onLessonAttributesChange,
  onModuleTitleChange,
  onAddLesson,
  onAddBlock,
  onDeleteBlocks,
}: ModuleSectionProps) {
  const isModuleSelected = selectedModuleId === moduleItem.id;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");

  const commitTitleChange = () => {
    const nextTitle = draftTitle.trim();

    if (!nextTitle) {
      setDraftTitle(moduleItem.title);
      setIsEditingTitle(false);
      return;
    }

    if (nextTitle !== moduleItem.title) {
      onModuleTitleChange(moduleItem.id, nextTitle);
    }

    setIsEditingTitle(false);
  };

  return (
    <section
      className={`space-y-4 rounded-3xl border p-3 transition-all ${
        isModuleSelected
          ? "border-sky-200 bg-white/80 ring-2 ring-sky-100 shadow-[0_16px_40px_rgba(14,165,233,0.12)]"
          : "border-transparent"
      }`}
    >
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Module
            {isModuleSelected ? (
              <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] tracking-[0.12em] text-sky-700">
                Selected
              </span>
            ) : null}
          </p>
          {isEditingTitle ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                value={draftTitle}
                onChange={(event) => {
                  setDraftTitle(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    commitTitleChange();
                  }

                  if (event.key === "Escape") {
                    setDraftTitle(moduleItem.title);
                    setIsEditingTitle(false);
                  }
                }}
                onBlur={commitTitleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-lg font-semibold tracking-tight text-slate-900 outline-none ring-sky-200 transition focus:border-sky-400 focus:ring"
                aria-label="Module title"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="cursor-pointer text-2xl font-semibold tracking-tight text-slate-900 transition-colors hover:text-sky-700">
                <button
                  type="button"
                  className="cursor-pointer text-left transition-colors hover:text-sky-700"
                  onClick={() => {
                    onSelectModule(moduleItem.id);
                  }}
                >
                  {moduleItem.title}
                </button>
              </h2>
              <button
                type="button"
                onClick={() => {
                  onSelectModule(moduleItem.id);
                  setDraftTitle(moduleItem.title);
                  setIsEditingTitle(true);
                }}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Rename
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
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
          <button
            type="button"
            onClick={() => {
              onAddLesson(moduleItem.id);
            }}
            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
          >
            Add Lesson
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {moduleItem.lessons.map((lessonItem) => {
          const isLessonSelected = selectedLessonId === lessonItem.id;

          return (
            <div
              key={lessonItem.id}
              className="space-y-2 rounded-4xl"
              onClick={() => {
                onSelectLesson(moduleItem.id, lessonItem.id);
              }}
            >
              <LessonCanvas
                key={`${lessonItem.id}-${isLessonSelected ? "active" : "inactive"}`}
                id={lessonItem.id}
                isSelected={isLessonSelected}
                title={lessonItem.title}
                duration={lessonItem.duration}
                objective={lessonItem.objective}
                blocks={lessonItem.blocks}
                selectedBlockId={selectedBlockId}
                onCanvasClick={() => {
                  onSelectLesson(moduleItem.id, lessonItem.id);
                }}
                onBlockClick={(block) => {
                  onSelectBlock(moduleItem.id, lessonItem.id, block.id);
                }}
                onLessonAttributesChange={(values) => {
                  onLessonAttributesChange(lessonItem.id, values);
                }}
                onDeleteBlocks={(blockIds) => {
                  onDeleteBlocks(moduleItem.id, lessonItem.id, blockIds);
                }}
              />

              {isLessonSelected ? (
                <div className="flex justify-end px-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddBlock(moduleItem.id, lessonItem.id, "richtext");
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Quick Add Text Block
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
