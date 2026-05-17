"use client";

import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";
import { useCallback, useState } from "react";

const MIN_FONT_SIZE_PX = 9;
const MAX_FONT_SIZE_PX = 72;
const DEFAULT_FONT_SIZE_PX = 16;

const FONT_SIZE_OPTIONS = [
  9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72,
];

function normalizeFontSize(fontSizePx?: number) {
  if (
    typeof fontSizePx === "number" &&
    Number.isInteger(fontSizePx) &&
    fontSizePx >= MIN_FONT_SIZE_PX &&
    fontSizePx <= MAX_FONT_SIZE_PX
  ) {
    return fontSizePx;
  }

  return DEFAULT_FONT_SIZE_PX;
}

export default function RichtextBlockDetail({
  block,
  onUpdateBlock,
  moduleId,
  lessonId,
}: BlockDetailComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(block.title);
  const [detail, setDetail] = useState(block.detail);
  const [duration, setDuration] = useState(block.duration);
  const [fontSizePx, setFontSizePx] = useState(
    normalizeFontSize(block.fontSizePx),
  );

  const handleSave = useCallback(() => {
    const normalizedTitle = title.trim();

    if (moduleId && lessonId && onUpdateBlock) {
      onUpdateBlock(moduleId, lessonId, block.id, {
        title: normalizedTitle,
        detail: detail || block.detail,
        duration: duration || block.duration,
        fontSizePx,
      });
    }
    setIsEditing(false);
  }, [
    block.id,
    block.detail,
    block.duration,
    block.title,
    detail,
    duration,
    fontSizePx,
    lessonId,
    moduleId,
    onUpdateBlock,
    title,
  ]);

  const handleCancel = useCallback(() => {
    setTitle(block.title);
    setDetail(block.detail);
    setDuration(block.duration);
    setFontSizePx(normalizeFontSize(block.fontSizePx));
    setIsEditing(false);
  }, [block.detail, block.duration, block.fontSizePx, block.title]);

  if (!isEditing) {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold text-foreground">
            {block.title}
          </h3>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Text
          </span>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Content
            </p>
            <span className="rounded-full border border-emerald-200 bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {normalizeFontSize(block.fontSizePx)}px
            </span>
          </div>
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-surface p-4 text-sm leading-6 text-muted-foreground">
            {block.detail || "(No content)"}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Duration: {block.duration}
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 transition-colors hover:bg-blue-100"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Block Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter block title"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Content
        </label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter rich text content"
        />

        <div className="mt-3">
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Font Size (px)
          </label>
          <select
            value={fontSizePx}
            onChange={(e) => {
              setFontSizePx(Number(e.target.value));
            }}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FONT_SIZE_OPTIONS.map((sizePx) => (
              <option key={sizePx} value={sizePx}>
                {sizePx}px
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Duration
        </label>
        <input
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. 5 min"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-emerald-700"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
