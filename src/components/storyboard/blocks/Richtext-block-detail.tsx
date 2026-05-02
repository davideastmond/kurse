"use client";

import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";

export default function RichtextBlockDetail({
  block,
}: BlockDetailComponentProps) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">{block.title}</h3>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Text
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-600">{block.detail}</p>
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Rich Text Preview
        </p>
        <div className="mt-3 rounded-2xl border border-emerald-100 bg-white p-4 text-sm leading-6 text-slate-700">
          This area can host formatting controls and a markdown/editor preview.
        </div>
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        Duration: {block.duration}
      </p>
    </div>
  );
}
