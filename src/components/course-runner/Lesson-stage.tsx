"use client";

import InlineQuizRunner from "@/components/course-runner/Inline-quiz-runner";
import type { LessonStageProps } from "@/components/course-runner/definitions";

function blockTypeLabel(type: string) {
  if (type === "richtext") return "Text";
  if (type === "quiz_inline") return "Inline Quiz";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function LessonStage({
  module,
  lesson,
  canGoPrevious,
  canGoNext,
  nextLabel,
  isSavingProgress,
  onPrevious,
  onNext,
  onInlineQuizGateChange,
}: LessonStageProps) {
  return (
    <section className="space-y-5">
      <header className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {module.title}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {lesson.title}
        </h2>
        {lesson.objective ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {lesson.objective}
          </p>
        ) : null}
      </header>

      <div className="space-y-4">
        {lesson.blocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            This lesson does not contain content blocks yet.
          </div>
        ) : null}

        {lesson.blocks.map((block) => {
          if (block.type === "quiz_inline") {
            return (
              <InlineQuizRunner
                key={block.id}
                block={block}
                onGateChange={(passed) => {
                  onInlineQuizGateChange(block.id, passed);
                }}
              />
            );
          }

          return (
            <article
              key={block.id}
              className="space-y-3 rounded-2xl border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {block.title}
                </h3>
                <span className="rounded-full border border-border px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {blockTypeLabel(block.type)}
                </span>
              </div>

              {block.type === "image" && block.imageUrl ? (
                <img
                  src={block.imageUrl}
                  alt={block.title}
                  className="max-h-80 w-full rounded-xl object-cover"
                />
              ) : null}

              {block.type === "video" && block.videoUrl ? (
                <video
                  controls
                  className="w-full rounded-xl"
                  src={block.videoUrl}
                />
              ) : null}

              {block.type === "audio" && block.audioUrl ? (
                <audio controls className="w-full" src={block.audioUrl} />
              ) : null}

              <p
                className="whitespace-pre-wrap leading-7 text-foreground"
                style={
                  block.type === "richtext" && block.fontSizePx
                    ? { fontSize: `${block.fontSizePx}px` }
                    : undefined
                }
              >
                {block.detail}
              </p>
            </article>
          );
        })}
      </div>

      <footer className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious || isSavingProgress}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isSavingProgress}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSavingProgress ? "Saving..." : nextLabel}
        </button>
      </footer>
    </section>
  );
}
