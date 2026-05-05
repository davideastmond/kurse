"use client";

import { uploadToS3 } from "@/app/actions/s3-uploader";
import type { BlockDetailComponentProps } from "@/components/storyboard/blocks/definitions";
import Image from "next/image";
import { useCallback, useState } from "react";

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export default function ImageBlockDetail({
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

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setErrorMessage("Image must be 2MB or smaller.");
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
        imageUrl: result.url,
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

  const imageCanvas = (
    <div className="space-y-4 rounded-3xl border border-fuchsia-200 bg-fuchsia-50/60 p-4">
      <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-700">
        Image File
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          void handleFileSelect(event);
        }}
        disabled={isUploading}
        className="block w-full cursor-pointer rounded-lg border border-fuchsia-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-fuchsia-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:uppercase file:tracking-[0.12em] file:text-fuchsia-700 hover:file:bg-fuchsia-200 disabled:cursor-not-allowed disabled:opacity-60"
      />

      {isUploading ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-700">
          Uploading image...
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <div className="rounded-2xl border border-fuchsia-100 bg-white p-3">
        {block.imageUrl ? (
          <Image
            src={block.imageUrl}
            alt={block.title}
            className="h-auto max-h-72 w-full rounded-xl object-contain"
            width={1200}
            height={900}
            sizes="100vw"
          />
        ) : (
          <p className="py-10 text-center text-sm text-fuchsia-800">
            Select an image to upload and preview it here.
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
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xl font-semibold text-slate-950 placeholder-slate-400 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            placeholder="Block title"
          />
          <span className="shrink-0 rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-700">
            Image
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
            Detail
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 placeholder-slate-400 focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            placeholder="Describe this image block"
          />
        </div>

        {imageCanvas}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 rounded-lg bg-fuchsia-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-fuchsia-700"
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
        <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-700">
          Image
        </span>
      </div>
      <p className="text-sm leading-6 text-slate-600">{block.detail}</p>

      {imageCanvas}

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Duration: {block.duration}
        </p>
        <button
          onClick={() => setIsEditing(true)}
          className="rounded-lg bg-fuchsia-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-fuchsia-700 transition-colors hover:bg-fuchsia-100"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
