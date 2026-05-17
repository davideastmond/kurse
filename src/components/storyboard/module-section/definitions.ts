import type { StoryboardRenderModule } from "@/app/utils/storyboard-builder/definitions";
import type { LessonCanvasEditableValues } from "@/components/storyboard/lesson-canvas/Lesson-canvas";
import type {
  ModuleEvaluation,
  StoryboardBlockType,
} from "@/shared/types/storyboard";

export type ModuleSectionProps = {
  moduleItem: StoryboardRenderModule;
  moduleIndex: number;
  moduleCount: number;
  readOnly?: boolean;
  selectedModuleId?: string;
  selectedLessonId?: string;
  selectedBlockId?: string;
  onDeleteModule: (moduleId: string) => void;
  onSelectModule: (moduleId: string) => void;
  onSelectLesson: (moduleId: string, lessonId: string) => void;
  onSelectBlock: (moduleId: string, lessonId: string, blockId: string) => void;
  onModuleTitleChange: (moduleId: string, title: string) => void;
  onMoveModule: (moduleId: string, direction: "up" | "down") => void;
  onLessonAttributesChange: (
    lessonId: string,
    values: LessonCanvasEditableValues,
  ) => void;
  onMoveLesson: (
    moduleId: string,
    lessonId: string,
    direction: "up" | "down",
  ) => void;
  onAddLesson: (moduleId: string) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
  onAddBlock: (
    moduleId: string,
    lessonId: string,
    blockType: StoryboardBlockType,
  ) => void;
  onMoveBlock: (
    moduleId: string,
    lessonId: string,
    blockId: string,
    direction: "up" | "down",
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
