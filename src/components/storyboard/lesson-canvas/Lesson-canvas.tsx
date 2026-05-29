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
  onDeleteLesson?: () => void;
  onMoveLessonUp?: () => void;
  onMoveLessonDown?: () => void;
  canMoveLessonUp?: boolean;
  canMoveLessonDown?: boolean;
  onMoveBlock?: (blockId: string, direction: "up" | "down") => void;
  className?: string;
};

const BLOCK_TYPE_LABELS: Record<LessonCanvasBlock["type"], string> = {
  video: "Video",
  richtext: "Text",
  image: "Image",
  quiz_inline: "Inline Quiz",
  audio: "Audio",
  link: "Link",
};

function getBlockCardClasses(isSelected: boolean, isInteractive: boolean) {
  const interactiveClasses = isInteractive
    ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
    : "cursor-default";

  const selectedClasses = isSelected
    ? "border-primary/60 bg-primary/10 shadow-sm"
    : "border-border bg-surface";

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
  onDeleteLesson,
  onMoveLessonUp,
  onMoveLessonDown,
  canMoveLessonUp = false,
  canMoveLessonDown = false,
  onMoveBlock,
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
    "rounded-4xl border border-border bg-surface p-5 shadow-sm transition-all",
    isSelected
      ? "border-primary/60 bg-primary/10 ring-2 ring-primary/25 shadow-md"
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
      <header className="flex flex-col gap-3 border-b border-border/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
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
                const nextFocusNode =
                  nextFocusTarget instanceof Node ? nextFocusTarget : null;
                const isStillInsideCanvas =
                  !!nextFocusNode &&
                  !!sectionRef.current?.contains(nextFocusNode);

                saveEdit({ closeBatchAfterTitle: !isStillInsideCanvas });
              }}
              onKeyDown={handleEditorKeyDown}
              className="w-full max-w-3xl rounded-xl border border-brand-300 bg-surface px-3 py-2 text-2xl font-semibold tracking-tight text-foreground outline-none ring-brand-500 focus:ring-2"
              aria-label="Edit lesson title"
            />
          ) : (
            <h2
              className={`text-2xl font-semibold tracking-tight text-foreground ${isEditable ? "cursor-text" : ""}`}
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
              className="w-full max-w-3xl rounded-xl border border-brand-300 bg-surface px-3 py-2 text-sm leading-6 text-muted-foreground outline-none ring-brand-500 focus:ring-2"
              aria-label="Edit lesson objective"
            />
          ) : (
            <p
              className={`max-w-3xl text-sm leading-6 ${objective ? "text-muted-foreground" : "text-muted-foreground"} ${isEditable ? "cursor-text" : ""}`}
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
            className="w-36 rounded-full border border-brand-300 bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground outline-none ring-brand-500 focus:ring-2"
            aria-label="Edit lesson duration"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div
              className={`inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${duration ? "text-muted-foreground" : "text-muted-foreground"} ${isEditable ? "cursor-text" : ""}`}
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
                className="inline-flex rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition hover:border-border hover:bg-muted"
              >
                Done
              </button>
            ) : null}
            {!isBatchEditing && isSelected && onDeleteLesson ? (
              <>
                {onMoveLessonUp || onMoveLessonDown ? (
                  <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMoveLessonUp?.();
                      }}
                      aria-label="Move lesson up"
                      title="Move lesson up"
                      disabled={!canMoveLessonUp}
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
                      onClick={(event) => {
                        event.stopPropagation();
                        onMoveLessonDown?.();
                      }}
                      aria-label="Move lesson down"
                      title="Move lesson down"
                      disabled={!canMoveLessonDown}
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
                ) : null}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteLesson();
                  }}
                  aria-label="Delete lesson"
                  title="Delete lesson"
                  className="inline-flex items-center justify-center rounded-full border border-danger/40 bg-danger/15 p-1.5 text-danger transition hover:bg-danger/25"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zm0 5h2v9H9V8zm4 0h2v9h-2V8z" />
                  </svg>
                </button>
              </>
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
            className="rounded-lg border border-rose-300 bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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
              <div
                key={block.id}
                role={isInteractive ? "button" : undefined}
                tabIndex={isInteractive ? 0 : undefined}
                className={getBlockCardClasses(isSelected, isInteractive)}
                onClick={(event) => {
                  event.stopPropagation();
                  onBlockClick?.(block);
                }}
                onKeyDown={
                  isInteractive
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onBlockClick?.(block);
                        }
                      }
                    : undefined
                }
                aria-pressed={isInteractive ? isSelected : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {BLOCK_TYPE_LABELS[block.type]}
                  </span>
                  <div className="flex items-center gap-2">
                    {onMoveBlock ? (
                      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveBlock(block.id, "up");
                          }}
                          aria-label={`Move block ${block.title} up`}
                          title="Move block up"
                          disabled={blocks[0]?.id === block.id}
                          className="inline-flex items-center justify-center rounded-full border border-border bg-surface p-1 text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3 w-3"
                            aria-hidden="true"
                          >
                            <path d="M12 6l-7 7h4v5h6v-5h4z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMoveBlock(block.id, "down");
                          }}
                          aria-label={`Move block ${block.title} down`}
                          title="Move block down"
                          disabled={blocks[blocks.length - 1]?.id === block.id}
                          className="inline-flex items-center justify-center rounded-full border border-border bg-surface p-1 text-muted-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3 w-3"
                            aria-hidden="true"
                          >
                            <path d="M12 18l7-7h-4V6H9v5H5z" />
                          </svg>
                        </button>
                      </div>
                    ) : null}
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
                        className="h-4 w-4 rounded border-border text-rose-600 focus:ring-rose-500"
                      />
                    ) : null}
                    <span className="text-xs font-medium text-muted-foreground">
                      {block.duration}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-foreground">
                    {block.title}
                  </h3>
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {block.detail}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-dashed border-border bg-surface/70 px-5 py-10 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
            Add blocks to start composing this lesson.
          </div>
        )}
      </div>
    </section>
  );
}
