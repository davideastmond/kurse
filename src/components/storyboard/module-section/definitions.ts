import type { StoryboardRenderModule } from "@/app/utils/storyboard-builder/definitions";
import type { LessonCanvasEditableValues } from "@/components/storyboard/lesson-canvas/Lesson-canvas";
import type { StoryboardBlockType } from "@/shared/types/storyboard";

export type ModuleSectionProps = {
  moduleItem: StoryboardRenderModule;
  selectedModuleId?: string;
  selectedLessonId?: string;
  selectedBlockId?: string;
  onSelectModule: (moduleId: string) => void;
  onSelectLesson: (moduleId: string, lessonId: string) => void;
  onSelectBlock: (moduleId: string, lessonId: string, blockId: string) => void;
  onModuleTitleChange: (moduleId: string, title: string) => void;
  onLessonAttributesChange: (
    lessonId: string,
    values: LessonCanvasEditableValues,
  ) => void;
  onAddLesson: (moduleId: string) => void;
  onAddBlock: (
    moduleId: string,
    lessonId: string,
    blockType: StoryboardBlockType,
  ) => void;
};
