"use client";

import { uploadToS3 } from "@/app/actions/s3-uploader";
import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";
import { useCallback, useState } from "react";

const MAX_VIDEO_SIZE_BYTES = 5 * 1024 * 1024;

export default function VideoBlockDetail({
  block,
  onUpdateBlock,
  moduleId,
  lessonId,
}: BlockDetailComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState(block.title);
  const [videoUrlDraft, setVideoUrlDraft] = useState(block.videoUrl ?? "");

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please select a valid video file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setErrorMessage("Video file must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadToS3(formData);

    if ("error" in result) {
      setErrorMessage(result.error);
      setIsUploading(false);
      event.target.value = "";
      return;
    }

    setVideoUrlDraft(result.url);
    setIsUploading(false);
    event.target.value = "";
  };

  const handleSave = useCallback(() => {
    if (!moduleId || !lessonId || !onUpdateBlock) {
      setIsEditing(false);
      return;
    }

    const trimmedUrl = videoUrlDraft.trim();

    if (trimmedUrl) {
      try {
        new URL(trimmedUrl);
      } catch {
        setErrorMessage("Enter a valid video URL.");
        return;
      }
    }

    onUpdateBlock(moduleId, lessonId, block.id, {
      title: title || block.title,
      videoUrl: trimmedUrl || undefined,
    });

    setErrorMessage(null);
    setIsEditing(false);
  }, [
    block.id,
    block.title,
    lessonId,
    moduleId,
    onUpdateBlock,
    title,
    videoUrlDraft,
  ]);

  const handleCancel = useCallback(() => {
    setTitle(block.title);
    setVideoUrlDraft(block.videoUrl ?? "");
    setErrorMessage(null);
    setIsEditing(false);
  }, [block.title, block.videoUrl]);

  const videoLink = block.videoUrl || videoUrlDraft.trim();

  if (isEditing) {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xl font-semibold text-slate-950 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Video block title"
          />
          <span className="shrink-0 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
            Video
          </span>
        </div>

        <p className="text-sm leading-6 text-slate-600">{block.detail}</p>

        <div className="space-y-4 rounded-3xl border border-sky-200 bg-sky-50/60 p-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              Video Link
            </label>
            <input
              type="url"
              value={videoUrlDraft}
              onChange={(event) => setVideoUrlDraft(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="https://example.com/video"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              Upload Video
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(event) => {
                void handleFileSelect(event);
              }}
              disabled={isUploading}
              className="mt-1 block w-full cursor-pointer rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-sky-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:text-sky-700 hover:file:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {isUploading ? (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
              Uploading video...
            </p>
          ) : null}

          {videoLink ? (
            <a
              href={videoLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 transition-colors hover:bg-sky-100"
            >
              Open Video In New Tab
            </a>
          ) : (
            <p className="text-sm text-sky-800">
              Paste a video link or upload a local video file.
            </p>
          )}
        </div>

        {errorMessage ? (
          <p className="text-sm text-red-700">{errorMessage}</p>
        ) : null}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-sky-700"
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

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">{block.title}</h3>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
          Video
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-600">{block.detail}</p>

      <div className="space-y-3 rounded-3xl border border-sky-200 bg-sky-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
          Video Source
        </p>
        {block.videoUrl ? (
          <a
            href={block.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 transition-colors hover:bg-sky-100"
          >
            Open Video In New Tab
          </a>
        ) : (
          <p className="text-sm text-sky-800">
            No video linked yet. Use Edit to add a URL or upload a local file.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Duration: {block.duration}
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 transition-colors hover:bg-sky-100"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
