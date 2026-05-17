"use client";

import ConfirmDialog from "@/components/dialogs/Confirm-dialog";
import LessonCanvas from "@/components/storyboard/lesson-canvas/Lesson-canvas";
import ModuleEvaluationCanvas from "@/components/storyboard/module-evaluation/Module-evaluation-canvas";
import type { ModuleSectionProps } from "@/components/storyboard/module-section/definitions";
import { useState } from "react";

type PendingDelete =
  | { type: "module" }
  | { type: "lesson"; lessonId: string; lessonTitle: string };

export default function ModuleSection({
  moduleItem,
  moduleIndex,
  moduleCount,
  readOnly = false,
  selectedModuleId,
  selectedLessonId,
  selectedBlockId,
  onDeleteModule,
  onSelectModule,
  onSelectLesson,
  onSelectBlock,
  onLessonAttributesChange,
  onModuleTitleChange,
  onMoveModule,
  onMoveLesson,
  onAddLesson,
  onDeleteLesson,
  onAddBlock,
  onMoveBlock,
  onDeleteBlocks,
  onUpdateModuleEvaluation,
  onDeleteModuleEvaluation,
}: ModuleSectionProps) {
  const isModuleSelected = selectedModuleId === moduleItem.id;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );

  const commitTitleChange = () => {
    if (readOnly) {
      setIsEditingTitle(false);
      return;
    }

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
          ? "border-sky-200 bg-surface/80 ring-2 ring-sky-100 shadow-[0_16px_40px_rgba(14,165,233,0.12)]"
          : "border-transparent"
      }`}
    >
      <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
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
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-lg font-semibold tracking-tight text-foreground outline-none ring-sky-200 transition focus:border-sky-400 focus:ring"
                aria-label="Module title"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="cursor-pointer text-2xl font-semibold tracking-tight text-foreground transition-colors hover:text-sky-700">
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
              {!readOnly ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectModule(moduleItem.id);
                      setDraftTitle(moduleItem.title);
                      setIsEditingTitle(true);
                    }}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-border hover:bg-muted"
                  >
                    Rename
                  </button>
                  <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
                    <button
                      type="button"
                      onClick={() => onMoveModule(moduleItem.id, "up")}
                      disabled={moduleIndex === 0}
                      aria-label={`Move module ${moduleItem.title} up`}
                      title="Move module up"
                      className="inline-flex items-center justify-center rounded-full border border-border bg-surface p-1.5 text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M12 6l-7 7h4v5h6v-5h4z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveModule(moduleItem.id, "down")}
                      disabled={moduleIndex === moduleCount - 1}
                      aria-label={`Move module ${moduleItem.title} down`}
                      title="Move module down"
                      className="inline-flex items-center justify-center rounded-full border border-border bg-surface p-1.5 text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      >
                        <path d="M12 18l7-7h-4V6H9v5H5z" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDelete({ type: "module" });
                    }}
                    className="rounded-full border border-danger/40 bg-danger/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-danger transition hover:bg-danger/20"
                  >
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {moduleItem.progressLabel ? (
            <span className="rounded-full border border-border bg-surface px-3 py-1 font-semibold">
              {moduleItem.progressLabel}
            </span>
          ) : null}
          {moduleItem.evaluationTitle ? (
            <span className="rounded-full border border-border bg-surface px-3 py-1 font-semibold">
              {moduleItem.evaluationTitle}
            </span>
          ) : null}
          {!readOnly ? (
            <button
              type="button"
              onClick={() => {
                onAddLesson(moduleItem.id);
              }}
              className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
            >
              Add Lesson
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-5">
        {moduleItem.lessons.map((lessonItem, lessonIndex) => {
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
                onLessonAttributesChange={
                  readOnly
                    ? undefined
                    : (values) => {
                        onLessonAttributesChange(lessonItem.id, values);
                      }
                }
                onDeleteLesson={
                  readOnly
                    ? undefined
                    : () => {
                        setPendingDelete({
                          type: "lesson",
                          lessonId: lessonItem.id,
                          lessonTitle: lessonItem.title,
                        });
                      }
                }
                onMoveLessonUp={
                  readOnly || lessonIndex === 0
                    ? undefined
                    : () => {
                        onMoveLesson(moduleItem.id, lessonItem.id, "up");
                      }
                }
                onMoveLessonDown={
                  readOnly || lessonIndex === moduleItem.lessons.length - 1
                    ? undefined
                    : () => {
                        onMoveLesson(moduleItem.id, lessonItem.id, "down");
                      }
                }
                canMoveLessonUp={lessonIndex > 0}
                canMoveLessonDown={lessonIndex < moduleItem.lessons.length - 1}
                onMoveBlock={
                  readOnly
                    ? undefined
                    : (blockId, direction) => {
                        onMoveBlock(
                          moduleItem.id,
                          lessonItem.id,
                          blockId,
                          direction,
                        );
                      }
                }
                onDeleteBlocks={
                  readOnly
                    ? undefined
                    : (blockIds) => {
                        onDeleteBlocks(moduleItem.id, lessonItem.id, blockIds);
                      }
                }
              />

              {isLessonSelected && !readOnly ? (
                <div className="flex justify-end px-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddBlock(moduleItem.id, lessonItem.id, "richtext");
                    }}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:border-border hover:bg-muted"
                  >
                    Quick Add Text Block
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}

        {moduleItem.evaluation ? (
          <ModuleEvaluationCanvas
            evaluation={moduleItem.evaluation}
            moduleId={moduleItem.id}
            readOnly={readOnly}
            onUpdate={onUpdateModuleEvaluation}
            onDelete={onDeleteModuleEvaluation}
          />
        ) : null}
      </div>

      {pendingDelete ? (
        <ConfirmDialog
          message={
            pendingDelete.type === "module"
              ? `Delete module "${moduleItem.title}"? This removes all lessons and blocks in this module.`
              : `Delete lesson "${pendingDelete.lessonTitle}"? This removes all blocks in this lesson.`
          }
          onConfirm={() => {
            if (pendingDelete.type === "module") {
              onDeleteModule(moduleItem.id);
            } else {
              onDeleteLesson(moduleItem.id, pendingDelete.lessonId);
            }
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      ) : null}
    </section>
  );
}
