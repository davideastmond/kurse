"use client";

import { type StoryboardBlock } from "@/shared/types/storyboard";
import { useRef, useState } from "react";

type LessonCanvasBlock = StoryboardBlock;

export type LessonCanvasEditableField = "title" | "objective" | "duration";

export type LessonCanvasEditableValues = {
  title?: string;
  objective?: string;
  duration?: string;
};

type LessonCanvasProps = {
  id?: string;
  title: string;
  duration?: string;
  objective?: string;
  blocks: LessonCanvasBlock[];
  isSelected?: boolean;
  selectedBlockId?: string;
  onCanvasClick?: () => void;
  onBlockClick?: (block: LessonCanvasBlock) => void;
  onLessonAttributesChange?: (values: LessonCanvasEditableValues) => void;
  onDeleteBlocks?: (blockIds: string[]) => void;
  className?: string;
};

const BLOCK_TYPE_LABELS: Record<LessonCanvasBlock["type"], string> = {
  video: "Video",
  richtext: "Text",
  image: "Image",
  quiz_inline: "Quiz",
  audio: "Audio",
};

function getBlockButtonClasses(isSelected: boolean, isInteractive: boolean) {
  const interactiveClasses = isInteractive
    ? "cursor-pointer hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    : "cursor-default";

  const selectedClasses = isSelected
    ? "border-brand-400 bg-brand-50/70 shadow-sm"
    : "border-slate-200 bg-white";

  return `flex w-full flex-col gap-3 rounded-3xl border p-4 text-left transition ${interactiveClasses} ${selectedClasses}`;
}

export default function LessonCanvas({
  id,
  title,
  duration,
  objective,
  blocks,
  isSelected,
  selectedBlockId,
  onCanvasClick,
  onBlockClick,
  onLessonAttributesChange,
  onDeleteBlocks,
  className,
}: LessonCanvasProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [editingField, setEditingField] =
    useState<LessonCanvasEditableField | null>(null);
  const [draftValue, setDraftValue] = useState("");
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);

  const isEditable = typeof onLessonAttributesChange === "function";

  const startEditing = (field: LessonCanvasEditableField, value?: string) => {
    if (!isEditable) {
      return;
    }

    setEditingField(field);
    setDraftValue(value ?? "");
  };

  const stopEditing = () => {
    setEditingField(null);
    setDraftValue("");
  };

  const stopBatchEditing = () => {
    stopEditing();
    setIsBatchEditing(false);
    setSelectedBlockIds([]);
  };

  const saveEdit = (options?: { closeBatchAfterTitle?: boolean }) => {
    if (!editingField || !onLessonAttributesChange) {
      return;
    }

    const normalizedValue = draftValue.trim();
    const isTitleEdit = editingField === "title";
    const shouldCloseBatchAfterTitle =
      options?.closeBatchAfterTitle ?? isBatchEditing;

    if (isTitleEdit) {
      if (!normalizedValue) {
        if (isBatchEditing && shouldCloseBatchAfterTitle) {
          stopBatchEditing();
        } else {
          stopEditing();
        }
        return;
      }

      onLessonAttributesChange({ title: normalizedValue });
      if (isBatchEditing && shouldCloseBatchAfterTitle) {
        stopBatchEditing();
      } else {
        stopEditing();
      }
      return;
    }

    if (editingField === "objective") {
      onLessonAttributesChange({ objective: normalizedValue || undefined });
      stopEditing();
      return;
    }

    onLessonAttributesChange({ duration: normalizedValue || undefined });
    stopEditing();
  };

  const handleBatchSelectionToggle = (blockId: string) => {
    setSelectedBlockIds((current) => {
      if (current.includes(blockId)) {
        return current.filter((candidate) => candidate !== blockId);
      }

      return [...current, blockId];
    });
  };

  const handleDeleteSelected = () => {
    if (!onDeleteBlocks || selectedBlockIds.length === 0) {
      return;
    }

    onDeleteBlocks(selectedBlockIds);
    setSelectedBlockIds([]);
  };

  const handleEditorKeyDown: React.KeyboardEventHandler<
    HTMLInputElement | HTMLTextAreaElement
  > = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      saveEdit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (editingField === "title" && isBatchEditing) {
        stopBatchEditing();
      } else {
        stopEditing();
      }
    }
  };

  const canvasClassName = [
    "rounded-4xl border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-all",
    isSelected
      ? "border-sky-300 bg-[linear-gradient(180deg,rgba(240,249,255,0.95),rgba(248,250,252,0.95))] ring-2 ring-sky-100 shadow-[0_20px_55px_rgba(14,165,233,0.18)]"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      ref={sectionRef}
      id={id}
      className={canvasClassName}
      onClick={() => {
        onCanvasClick?.();
      }}
    >
      <header className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Lesson Canvas
          </p>
          {editingField === "title" ? (
            <input
              autoFocus
              value={draftValue}
              onChange={(event) => {
                setDraftValue(event.target.value);
              }}
              onBlur={(event) => {
                const nextFocusTarget = event.relatedTarget;
                const isStillInsideCanvas =
                  !!nextFocusTarget &&
                  !!sectionRef.current?.contains(nextFocusTarget);

                saveEdit({ closeBatchAfterTitle: !isStillInsideCanvas });
              }}
              onKeyDown={handleEditorKeyDown}
              className="w-full max-w-3xl rounded-xl border border-brand-300 bg-white px-3 py-2 text-2xl font-semibold tracking-tight text-slate-950 outline-none ring-brand-500 focus:ring-2"
              aria-label="Edit lesson title"
            />
          ) : (
            <h2
              className={`text-2xl font-semibold tracking-tight text-slate-950 ${isEditable ? "cursor-text" : ""}`}
              onDoubleClick={() => {
                setIsBatchEditing(true);
                startEditing("title", title);
              }}
              title={isEditable ? "Double-click to edit title" : undefined}
            >
              {title}
            </h2>
          )}
          {editingField === "objective" ? (
            <textarea
              autoFocus
              value={draftValue}
              onChange={(event) => {
                setDraftValue(event.target.value);
              }}
              onBlur={() => saveEdit()}
              onKeyDown={handleEditorKeyDown}
              rows={3}
              className="w-full max-w-3xl rounded-xl border border-brand-300 bg-white px-3 py-2 text-sm leading-6 text-slate-700 outline-none ring-brand-500 focus:ring-2"
              aria-label="Edit lesson objective"
            />
          ) : (
            <p
              className={`max-w-3xl text-sm leading-6 ${objective ? "text-slate-600" : "text-slate-400"} ${isEditable ? "cursor-text" : ""}`}
              onDoubleClick={() => {
                startEditing("objective", objective);
              }}
              title={isEditable ? "Double-click to edit objective" : undefined}
            >
              {objective || "Double-click to add an objective."}
            </p>
          )}
        </div>
        {editingField === "duration" ? (
          <input
            autoFocus
            value={draftValue}
            onChange={(event) => {
              setDraftValue(event.target.value);
            }}
            onBlur={() => saveEdit()}
            onKeyDown={handleEditorKeyDown}
            className="w-36 rounded-full border border-brand-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 outline-none ring-brand-500 focus:ring-2"
            aria-label="Edit lesson duration"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${duration ? "text-slate-600" : "text-slate-400"} ${isEditable ? "cursor-text" : ""}`}
              onDoubleClick={() => {
                startEditing("duration", duration);
              }}
              title={isEditable ? "Double-click to edit duration" : undefined}
            >
              {duration || "Add duration"}
            </div>

            {isBatchEditing ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  stopBatchEditing();
                }}
                className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Done
              </button>
            ) : null}
          </div>
        )}
      </header>

      {isBatchEditing ? (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
            Batch Edit: {selectedBlockIds.length} selected
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleDeleteSelected();
            }}
            disabled={selectedBlockIds.length === 0}
            className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete Selected
          </button>
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {blocks.length > 0 ? (
          blocks.map((block) => {
            const isSelected = block.id === selectedBlockId;
            const isInteractive = typeof onBlockClick === "function";
            const isChecked = selectedBlockIds.includes(block.id);

            return (
              <button
                key={block.id}
                type="button"
                className={getBlockButtonClasses(isSelected, isInteractive)}
                onClick={(event) => {
                  event.stopPropagation();
                  onBlockClick?.(block);
                }}
                aria-pressed={isInteractive ? isSelected : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    {BLOCK_TYPE_LABELS[block.type]}
                  </span>
                  <div className="flex items-center gap-2">
                    {isBatchEditing ? (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(event) => {
                          event.stopPropagation();
                          handleBatchSelectionToggle(block.id);
                        }}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                        aria-label={`Select block ${block.title}`}
                        className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                    ) : null}
                    <span className="text-xs font-medium text-slate-500">
                      {block.duration}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-slate-900">
                    {block.title}
                  </h3>
                  <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                    {block.detail}
                  </p>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">
            Add blocks to start composing this lesson.
          </div>
        )}
      </div>
    </section>
  );
}
