"use client";

import AudioBlockDetail from "@/components/storyboard/blocks/Audio-block-detail";
import type { BlockDetailRendererProps } from "@/components/storyboard/blocks/definitions";
import ImageBlockDetail from "@/components/storyboard/blocks/Image-block-detail";
import QuizInlineBlockDetail from "@/components/storyboard/blocks/Quiz-inline-block-detail";
import RichtextBlockDetail from "@/components/storyboard/blocks/Richtext-block-detail";
import VideoBlockDetail from "@/components/storyboard/blocks/Video-block-detail";

export default function BlockDetailRenderer({
  block,
  onUpdateBlock,
  moduleId,
  lessonId,
}: BlockDetailRendererProps) {
  if (!block) {
    return (
      <div className="mt-4 rounded-3xl border border-dashed border-border bg-muted px-4 py-10 text-sm leading-6 text-muted-foreground">
        Select a block from any lesson canvas to inspect a larger detail view.
      </div>
    );
  }

  if (block.type === "video") {
    return (
      <VideoBlockDetail
        block={block}
        onUpdateBlock={onUpdateBlock}
        moduleId={moduleId}
        lessonId={lessonId}
      />
    );
  }

  if (block.type === "richtext") {
    return (
      <RichtextBlockDetail
        block={block}
        onUpdateBlock={onUpdateBlock}
        moduleId={moduleId}
        lessonId={lessonId}
      />
    );
  }

  if (block.type === "image") {
    return (
      <ImageBlockDetail
        block={block}
        onUpdateBlock={onUpdateBlock}
        moduleId={moduleId}
        lessonId={lessonId}
      />
    );
  }

  if (block.type === "audio") {
    return (
      <AudioBlockDetail
        block={block}
        onUpdateBlock={onUpdateBlock}
        moduleId={moduleId}
        lessonId={lessonId}
      />
    );
  }

  return (
    <QuizInlineBlockDetail
      block={block}
      onUpdateBlock={onUpdateBlock}
      moduleId={moduleId}
      lessonId={lessonId}
    />
  );
}
