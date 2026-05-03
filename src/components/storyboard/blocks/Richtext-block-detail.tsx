"use client";

import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";
import { useCallback, useState } from "react";

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

  const handleSave = useCallback(() => {
    if (moduleId && lessonId && onUpdateBlock) {
      onUpdateBlock(moduleId, lessonId, block.id, {
        title: title || block.title,
        detail: detail || block.detail,
        duration: duration || block.duration,
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
    lessonId,
    moduleId,
    onUpdateBlock,
    title,
  ]);

  const handleCancel = useCallback(() => {
    setTitle(block.title);
    setDetail(block.detail);
    setDuration(block.duration);
    setIsEditing(false);
  }, [block.detail, block.duration, block.title]);

  if (!isEditing) {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold text-slate-950">
            {block.title}
          </h3>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Text
          </span>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Content
          </p>
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm leading-6 text-slate-700">
            {block.detail || "(No content)"}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
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
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
          Block Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter block title"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
          Content
        </label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Enter rich text content"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
          Duration
        </label>
        <input
          type="text"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
