import type { StoryboardBlock } from "@/shared/types/storyboard";

export type BlockDetailComponentProps = {
  block: StoryboardBlock;
};

export type BlockDetailRendererProps = {
  block: StoryboardBlock | null;
};
