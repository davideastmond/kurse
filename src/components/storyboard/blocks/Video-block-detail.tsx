"use client";

import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";

export default function VideoBlockDetail({ block }: BlockDetailComponentProps) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">{block.title}</h3>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
          Video
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-600">{block.detail}</p>
      <div className="rounded-3xl border border-sky-200 bg-sky-50/60 px-4 py-8 text-center text-sm text-sky-800">
        Video player preview with timeline markers can mount here.
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        Duration: {block.duration}
      </p>
    </div>
  );
}
