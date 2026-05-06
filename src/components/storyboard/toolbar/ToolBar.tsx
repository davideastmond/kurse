"use client";

import { type StoryboardBlockType } from "@/shared/types/storyboard";

type BlockType = StoryboardBlockType;

interface ToolBarProps {
  onAddModule?: () => void;
  onAddLesson?: () => void;
  onAddBlock?: (blockType: BlockType) => void;
}

interface ToolButton {
  id: BlockType | "lesson" | "module";
  label: string;
  icon: React.ReactNode;
  ariaLabel: string;
}

const SVGIcon = ({
  viewBox = "0 0 24 24",
  children,
}: {
  viewBox?: string;
  children: React.ReactNode;
}) => (
  <svg
    viewBox={viewBox}
    fill="currentColor"
    className="h-5 w-5"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const toolButtons: ToolButton[] = [
  {
    id: "module",
    label: "Add Module",
    ariaLabel: "Add a new module",
    icon: (
      <SVGIcon>
        <path d="M20 6h-8l-2-2H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm0 12H4V6h5.17l2 2H20v10zm-5-5h-2v-2c0-.55-.45-1-1-1s-1 .45-1 1v2H9c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1z" />
      </SVGIcon>
    ),
  },
  {
    id: "lesson",
    label: "Add Lesson",
    ariaLabel: "Add a new lesson",
    icon: (
      <SVGIcon>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9H13V8.5c0-.83-.67-1.5-1.5-1.5S10 7.67 10 8.5V11H8.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5H10v2.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V14h2.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
      </SVGIcon>
    ),
  },
  {
    id: "video",
    label: "Video",
    ariaLabel: "Add video block",
    icon: (
      <SVGIcon>
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
      </SVGIcon>
    ),
  },
  {
    id: "richtext",
    label: "Text",
    ariaLabel: "Add text block",
    icon: (
      <SVGIcon>
        <path
          d="M9.6 13.2L12 9.6l2.4 3.6M4 19h16v2H4z"
          strokeWidth="2"
          fill="none"
          stroke="currentColor"
        />
        <path d="M4 3h16c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2zm0 2v14h16V5H4z" />
      </SVGIcon>
    ),
  },
  {
    id: "image",
    label: "Image",
    ariaLabel: "Add image block",
    icon: (
      <SVGIcon>
        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
      </SVGIcon>
    ),
  },
  {
    id: "audio",
    label: "Audio",
    ariaLabel: "Add audio block",
    icon: (
      <SVGIcon>
        <path d="M12 3v9.28c-.47-.46-1.12-.75-1.84-.75-2.49 0-4.5 2.01-4.5 4.5S7.51 21 10 21c2.49 0 4.5-2.01 4.5-4.5V7h4V3h-6z" />
      </SVGIcon>
    ),
  },
  {
    id: "quiz_inline",
    label: "Inline Quiz",
    ariaLabel: "Add inline quiz block",
    icon: (
      <SVGIcon>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9h-7c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5h7c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5z" />
      </SVGIcon>
    ),
  },
];

export default function ToolBar({
  onAddModule,
  onAddLesson,
  onAddBlock,
}: ToolBarProps) {
  const handleModuleClick = () => {
    onAddModule?.();
  };

  const handleLessonClick = () => {
    onAddLesson?.();
  };

  const handleBlockClick = (blockType: BlockType) => {
    onAddBlock?.(blockType);
  };

  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-lg border border-border bg-surface p-2 shadow-sm">
      {toolButtons.map((button) => (
        <button
          key={button.id}
          onClick={() => {
            if (button.id === "module") {
              handleModuleClick();
            } else if (button.id === "lesson") {
              handleLessonClick();
            } else {
              handleBlockClick(button.id as BlockType);
            }
          }}
          className="group flex min-w-36 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:bg-muted/80 sm:justify-start"
          aria-label={button.ariaLabel}
          title={button.label}
        >
          <span className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">
            {button.icon}
          </span>
          <span className="hidden sm:inline">{button.label}</span>
        </button>
      ))}
    </div>
  );
}
