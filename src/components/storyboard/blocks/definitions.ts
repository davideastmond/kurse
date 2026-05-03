import type { StoryboardBlock } from "@/shared/types/storyboard";

export type BlockDetailComponentProps = {
  block: StoryboardBlock;
  onUpdateBlock?: (
    moduleId: string,
    lessonId: string,
    blockId: string,
    patch: Partial<StoryboardBlock>,
  ) => void;
  moduleId?: string;
  lessonId?: string;
};

export type BlockDetailRendererProps = {
  block: StoryboardBlock | null;
  onUpdateBlock?: (
    moduleId: string,
    lessonId: string,
    blockId: string,
    patch: Partial<StoryboardBlock>,
  ) => void;
  moduleId?: string;
  lessonId?: string;
};
