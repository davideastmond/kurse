import type { StoryboardRenderModule } from "@/app/utils/storyboard-builder/definitions";
import type { LessonCanvasEditableValues } from "@/components/storyboard/lesson-canvas/Lesson-canvas";
import type {
  ModuleEvaluation,
  StoryboardBlockType,
} from "@/shared/types/storyboard";

export type ModuleSectionProps = {
  moduleItem: StoryboardRenderModule;
  readOnly?: boolean;
  selectedModuleId?: string;
  selectedLessonId?: string;
  selectedBlockId?: string;
  onDeleteModule: (moduleId: string) => void;
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
  onDeleteBlocks: (
    moduleId: string,
    lessonId: string,
    blockIds: string[],
  ) => void;
  onUpdateModuleEvaluation: (
    moduleId: string,
    evaluation: ModuleEvaluation,
  ) => void;
  onDeleteModuleEvaluation: (moduleId: string) => void;
};
