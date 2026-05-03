"use client";

import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";

export default function QuizInlineBlockDetail({
  block,
}: BlockDetailComponentProps) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">{block.title}</h3>
        <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
          Quiz
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-600">{block.detail}</p>
      <div className="space-y-3 rounded-3xl border border-violet-200 bg-violet-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">
          Question Structure
        </p>
        <div className="rounded-2xl border border-violet-100 bg-white p-3 text-sm text-slate-700">
          Answer options, correctness rules, and inline feedback controls can
          mount here.
        </div>
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
        Duration: {block.duration}
      </p>
    </div>
  );
}
