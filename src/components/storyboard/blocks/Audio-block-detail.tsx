"use client";

import { uploadToS3 } from "@/app/actions/s3-uploader";
import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";
import { useCallback, useState } from "react";

const MAX_AUDIO_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a"];
const ACCEPTED_AUDIO_EXTENSIONS = ".mp3,.m4a";

export default function AudioBlockDetail({
  block,
  onUpdateBlock,
  moduleId,
  lessonId,
}: BlockDetailComponentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(block.title);
  const [detail, setDetail] = useState(block.detail);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
      setErrorMessage("Only MP3 or M4A files are accepted.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      setErrorMessage("Audio file must be 2MB or smaller.");
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

    if (moduleId && lessonId && onUpdateBlock) {
      onUpdateBlock(moduleId, lessonId, block.id, {
        audioUrl: result.url,
      });
    }

    setIsUploading(false);
    event.target.value = "";
  };

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedDetail = detail.trim();

    if (moduleId && lessonId && onUpdateBlock) {
      onUpdateBlock(moduleId, lessonId, block.id, {
        title: trimmedTitle || block.title,
        detail: trimmedDetail || block.detail,
      });
    }
    setIsEditing(false);
  }, [
    block.id,
    block.title,
    block.detail,
    detail,
    lessonId,
    moduleId,
    onUpdateBlock,
    title,
  ]);

  const handleCancel = useCallback(() => {
    setTitle(block.title);
    setDetail(block.detail);
    setIsEditing(false);
  }, [block.title, block.detail]);

  const audioCanvas = (
    <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50/60 p-4">
      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
        Audio File
        <span className="ml-2 font-normal normal-case tracking-normal text-amber-600">
          (MP3 or M4A, max 2MB)
        </span>
      </label>
      <input
        type="file"
        accept={ACCEPTED_AUDIO_EXTENSIONS}
        onChange={(event) => {
          void handleFileSelect(event);
        }}
        disabled={isUploading}
        className="block w-full cursor-pointer rounded-lg border border-amber-200 bg-surface px-3 py-2 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:text-amber-700 hover:file:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
      />

      {isUploading ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
          Uploading audio...
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-danger">{errorMessage}</p>
      ) : null}

      <div className="rounded-2xl border border-amber-100 bg-surface p-3">
        {block.audioUrl ? (
          <audio key={block.audioUrl} controls className="w-full rounded-lg">
            <source src={block.audioUrl} />
            Your browser does not support the audio element.
          </audio>
        ) : (
          <p className="py-6 text-center text-sm text-amber-800">
            Upload an audio file to enable playback here.
          </p>
        )}
      </div>
    </div>
  );

  if (isEditing) {
    return (
      <div className="mt-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xl font-semibold text-foreground placeholder:text-muted-foreground/70 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Block title"
          />
          <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Audio
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Detail
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="Describe this audio block"
          />
        </div>

        {audioCanvas}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-amber-700"
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
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
          Audio
        </span>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{block.detail}</p>

      {audioCanvas}

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Duration: {block.duration}
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 transition-colors hover:bg-amber-100"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
