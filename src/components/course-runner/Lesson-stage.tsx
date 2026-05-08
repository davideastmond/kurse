"use client";

import InlineQuizRunner from "@/components/course-runner/Inline-quiz-runner";
import type { LessonStageProps } from "@/components/course-runner/definitions";

function inferVideoMimeType(url: string): string {
  const path = url.split("?")[0] ?? "";
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    ogv: "video/ogg",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
  };
  return map[ext] ?? "video/mp4";
}

function proxyUrl(rawUrl: string): string {
  return `/api/media-proxy?url=${encodeURIComponent(rawUrl)}`;
}

type VideoKind =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "vimeo"; embedUrl: string }
  | { kind: "external"; url: string }
  | { kind: "file"; url: string };

function classifyVideoUrl(raw: string): VideoKind {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { kind: "file", url: raw };
  }

  const host = parsed.hostname.replace(/^www\./, "");

  // YouTube
  if (host === "youtube.com" || host === "youtu.be") {
    let videoId: string | null = null;
    if (host === "youtu.be") {
      videoId = parsed.pathname.slice(1).split("/")[0] ?? null;
    } else {
      videoId =
        parsed.searchParams.get("v") ??
        (parsed.pathname.startsWith("/embed/")
          ? (parsed.pathname.split("/embed/")[1]?.split("/")[0] ?? null)
          : null);
    }
    if (videoId) {
      return {
        kind: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
      };
    }
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    const videoId = segments.find((s) => /^\d+$/.test(s)) ?? null;
    if (videoId) {
      return {
        kind: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${videoId}`,
      };
    }
  }

  // Known social / streaming platforms that can't be embedded as <video>
  const socialHosts = [
    "instagram.com",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "facebook.com",
    "fb.watch",
    "twitch.tv",
    "dailymotion.com",
  ];
  if (socialHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
    return { kind: "external", url: raw };
  }

  // Direct file — stream through proxy
  return { kind: "file", url: raw };
}

export default function LessonStage({
  module,
  lesson,
  canGoPrevious,
  canGoNext,
  nextLabel,
  isSavingProgress,
  onPrevious,
  onNext,
  onInlineQuizGateChange,
}: LessonStageProps) {
  return (
    <section className="space-y-5">
      <header className="bg-surface p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {module.title}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          {lesson.title}
        </h2>
        {lesson.objective ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {lesson.objective}
          </p>
        ) : null}
      </header>

      <div className="space-y-4">
        {lesson.blocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            This lesson does not contain content blocks yet.
          </div>
        ) : null}

        {lesson.blocks.map((block) => {
          const hasBlockTitle = block.title.trim().length > 0;

          if (block.type === "quiz_inline") {
            return (
              <InlineQuizRunner
                key={block.id}
                block={block}
                onGateChange={(passed) => {
                  onInlineQuizGateChange(block.id, passed);
                }}
              />
            );
          }

          return (
            <article key={block.id} className="space-y-3 bg-surface p-5">
              {hasBlockTitle ? (
                <h3 className="text-lg font-semibold text-foreground">
                  {block.title}
                </h3>
              ) : null}

              {block.type === "image" && block.imageUrl ? (
                <img
                  src={block.imageUrl}
                  alt={block.title}
                  className="w-full rounded-xl object-contain"
                  style={{ maxHeight: "min(70vh, 640px)" }}
                />
              ) : null}

              {block.type === "video" && block.videoUrl
                ? (() => {
                    const classified = classifyVideoUrl(block.videoUrl);
                    if (
                      classified.kind === "youtube" ||
                      classified.kind === "vimeo"
                    ) {
                      return (
                        <div
                          className="relative w-full overflow-hidden rounded-xl"
                          style={{ paddingTop: "56.25%" }}
                        >
                          <iframe
                            src={classified.embedUrl}
                            className="absolute inset-0 h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={block.title || "video"}
                          />
                        </div>
                      );
                    }
                    if (classified.kind === "external") {
                      return (
                        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                          This video is hosted on an external platform.{" "}
                          <a
                            href={classified.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold underline hover:text-foreground"
                          >
                            Watch it here
                          </a>
                        </div>
                      );
                    }
                    // Direct file via proxy
                    return (
                      <video controls className="w-full rounded-xl">
                        <source
                          src={proxyUrl(classified.url)}
                          type={inferVideoMimeType(classified.url)}
                        />
                        <p className="p-4 text-sm text-muted-foreground">
                          Your browser cannot play this video.{" "}
                          <a
                            href={proxyUrl(classified.url)}
                            download
                            className="underline hover:text-foreground"
                          >
                            Download it
                          </a>{" "}
                          instead.
                        </p>
                      </video>
                    );
                  })()
                : null}

              {block.type === "audio" && block.audioUrl ? (
                <audio
                  controls
                  className="w-full"
                  src={proxyUrl(block.audioUrl)}
                />
              ) : null}

              <p
                className="whitespace-pre-wrap text-foreground"
                style={
                  block.type === "richtext" && block.fontSizePx
                    ? { fontSize: `${block.fontSizePx}px`, lineHeight: 1.6 }
                    : { lineHeight: 1.75 }
                }
              >
                {block.detail}
              </p>
            </article>
          );
        })}
      </div>

      <footer className="flex items-center justify-between bg-surface p-4">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrevious || isSavingProgress}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isSavingProgress}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSavingProgress ? "Saving..." : nextLabel}
        </button>
      </footer>
    </section>
  );
}
