"use client";

import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";
import { useCallback, useState } from "react";

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function LinkBlockDetail({
  block,
  onUpdateBlock,
  moduleId,
  lessonId,
}: BlockDetailComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(block.title);
  const [detail, setDetail] = useState(block.detail);
  const [duration, setDuration] = useState(block.duration);
  const [linkUrl, setLinkUrl] = useState(block.linkUrl ?? "");
  const [linkLabel, setLinkLabel] = useState(block.linkLabel ?? "");
  const [openInNewTab, setOpenInNewTab] = useState(block.openInNewTab ?? true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedDetail = detail.trim();
    const trimmedDuration = duration.trim();
    const trimmedLinkUrl = linkUrl.trim();
    const trimmedLinkLabel = linkLabel.trim();

    if (!trimmedTitle) {
      setErrorMessage("Link block title is required.");
      return;
    }

    if (!trimmedLinkUrl) {
      setErrorMessage("Link URL is required.");
      return;
    }

    if (!isValidHttpUrl(trimmedLinkUrl)) {
      setErrorMessage("Link URL must start with http:// or https://.");
      return;
    }

    if (!moduleId || !lessonId || !onUpdateBlock) {
      setIsEditing(false);
      return;
    }

    onUpdateBlock(moduleId, lessonId, block.id, {
      title: trimmedTitle,
      detail: trimmedDetail || block.detail,
      duration: trimmedDuration || block.duration,
      linkUrl: trimmedLinkUrl,
      linkLabel: trimmedLinkLabel || undefined,
      openInNewTab,
    });

    setErrorMessage(null);
    setIsEditing(false);
  }, [
    block.detail,
    block.duration,
    block.id,
    detail,
    duration,
    lessonId,
    linkLabel,
    linkUrl,
    moduleId,
    onUpdateBlock,
    openInNewTab,
    title,
  ]);

  const handleCancel = useCallback(() => {
    setTitle(block.title);
    setDetail(block.detail);
    setDuration(block.duration);
    setLinkUrl(block.linkUrl ?? "");
    setLinkLabel(block.linkLabel ?? "");
    setOpenInNewTab(block.openInNewTab ?? true);
    setErrorMessage(null);
    setIsEditing(false);
  }, [
    block.detail,
    block.duration,
    block.linkLabel,
    block.linkUrl,
    block.openInNewTab,
    block.title,
  ]);

  const href = block.linkUrl ?? linkUrl.trim();
  const ctaLabel = block.linkLabel?.trim() || "Open Link";

  if (isEditing) {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xl font-semibold text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="Link block title"
          />
          <span className="shrink-0 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
            Link
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Supporting Detail
          </label>
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="Explain what learners should open and why"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            URL
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="https://example.com/resource"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Button Label
          </label>
          <input
            type="text"
            value={linkLabel}
            onChange={(event) => setLinkLabel(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="Open Resource"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Duration
          </label>
          <input
            type="text"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            placeholder="e.g. 3 min"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={openInNewTab}
            onChange={(event) => setOpenInNewTab(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Open in new tab
        </label>

        {errorMessage ? (
          <p className="text-sm text-danger">{errorMessage}</p>
        ) : null}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-cyan-700"
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

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-foreground">{block.title}</h3>
        <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
          Link
        </span>
      </div>

      {block.detail ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {block.detail}
        </p>
      ) : null}

      <div className="rounded-3xl border border-cyan-200 bg-cyan-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
          Destination
        </p>
        {href ? (
          <a
            href={href}
            target={(block.openInNewTab ?? true) ? "_blank" : undefined}
            rel={
              (block.openInNewTab ?? true) ? "noopener noreferrer" : undefined
            }
            className="mt-2 inline-flex rounded-lg border border-cyan-200 bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 transition-colors hover:bg-cyan-100"
          >
            {ctaLabel}
          </a>
        ) : (
          <p className="mt-2 text-sm text-cyan-800">No URL configured yet.</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Duration: {block.duration}
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 transition-colors hover:bg-cyan-100"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
