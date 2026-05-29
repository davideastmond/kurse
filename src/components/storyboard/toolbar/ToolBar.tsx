"use client";

import {
  BLOCK_TYPES,
  type StoryboardBlockType,
} from "@/shared/types/storyboard";

type BlockType = StoryboardBlockType;

interface ToolBarProps {
  onAddModule?: () => void;
  onAddLesson?: () => void;
  onAddBlock?: (blockType: BlockType) => void;
  onAddModuleEvaluation?: () => void;
  onAddCourseEvaluation?: () => void;
  readOnly?: boolean;
  canAddBlock?: boolean;
  canAddModuleEvaluation?: boolean;
  canAddCourseEvaluation?: boolean;
}

interface ToolButton {
  id:
    | BlockType
    | "lesson"
    | "module"
    | "module_evaluation"
    | "course_evaluation";
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
    id: "link",
    label: "Link",
    ariaLabel: "Add link block",
    icon: (
      <SVGIcon>
        <path d="M3.9 12a5 5 0 0 1 5-5h3v2h-3a3 3 0 1 0 0 6h3v2h-3a5 5 0 0 1-5-5zm7.1 1h2v-2h-2v2zm4.1-6h-3v2h3a3 3 0 1 1 0 6h-3v2h3a5 5 0 1 0 0-10z" />
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
  {
    id: "module_evaluation",
    label: "Module Evaluation",
    ariaLabel: "Add a module evaluation",
    icon: (
      <SVGIcon>
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
      </SVGIcon>
    ),
  },
  {
    id: "course_evaluation",
    label: "Course Evaluation",
    ariaLabel: "Add a course evaluation",
    icon: (
      <SVGIcon>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
      </SVGIcon>
    ),
  },
];

export default function ToolBar({
  onAddModule,
  onAddLesson,
  onAddBlock,
  onAddModuleEvaluation,
  onAddCourseEvaluation,
  readOnly = false,
  canAddBlock = true,
  canAddModuleEvaluation = true,
  canAddCourseEvaluation = true,
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

  const isButtonDisabled = (buttonId: ToolButton["id"]) => {
    if (readOnly) {
      return true;
    }

    if (buttonId === "module_evaluation") {
      return !canAddModuleEvaluation;
    }

    if (buttonId === "course_evaluation") {
      return !canAddCourseEvaluation;
    }

    if (BLOCK_TYPES.includes(buttonId as BlockType)) {
      return !canAddBlock;
    }

    return false;
  };

  return (
    <div className="flex flex-wrap items-stretch gap-2 rounded-lg border border-border bg-surface p-2 shadow-sm">
      {toolButtons.map((button) => {
        const isDisabled = isButtonDisabled(button.id);

        return (
          <button
            key={button.id}
            type="button"
            onClick={() => {
              if (isDisabled) {
                return;
              }

              if (button.id === "module") {
                handleModuleClick();
              } else if (button.id === "lesson") {
                handleLessonClick();
              } else if (button.id === "module_evaluation") {
                onAddModuleEvaluation?.();
              } else if (button.id === "course_evaluation") {
                onAddCourseEvaluation?.();
              } else {
                handleBlockClick(button.id as BlockType);
              }
            }}
            disabled={isDisabled}
            className={`group flex min-w-36 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all sm:justify-start ${
              isDisabled
                ? "cursor-not-allowed text-muted-foreground/50"
                : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80"
            }`}
            aria-label={button.ariaLabel}
            title={button.label}
          >
            <span
              className={`shrink-0 transition-colors ${
                isDisabled
                  ? "text-muted-foreground/50"
                  : "text-muted-foreground group-hover:text-foreground"
              }`}
            >
              {button.icon}
            </span>
            <span className="hidden sm:inline">{button.label}</span>
          </button>
        );
      })}
    </div>
  );
}
