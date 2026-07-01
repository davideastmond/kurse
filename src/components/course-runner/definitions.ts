import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import type {
  CourseEvaluation,
  ModuleEvaluation,
  StoryboardBlock,
  StoryboardLesson,
  StoryboardModule,
} from "@/shared/types/storyboard";

export type CourseRunnerCourse = Pick<
  ApiCoursePayload,
  | "id"
  | "title"
  | "slug"
  | "synopsis"
  | "estimatedDuration"
  | "welcomeImages"
  | "courseEvaluation"
> & {
  modules: StoryboardModule[];
};

export type RunnerLessonRef = {
  moduleId: string;
  moduleTitle: string;
  lesson: StoryboardLesson;
  index: number;
};

export type RunnerSidebarProps = {
  course: CourseRunnerCourse;
  lessons: RunnerLessonRef[];
  selectedLessonId: string | null;
  selectedModuleEvalId: string | null;
  courseEvalSelected: boolean;
  unlockedLessonIds: Set<string>;
  completedLessonIds: Set<string>;
  unlockedModuleEvalIds: Set<string>;
  passedModuleEvalIds: Set<string>;
  courseEvalUnlocked: boolean;
  courseEvalPassed: boolean;
  progressPercent: number;
  onSelectLesson: (lessonId: string) => void;
  onSelectModuleEval: (moduleId: string) => void;
  onSelectCourseEval: () => void;
};

export type LessonStageProps = {
  module: StoryboardModule;
  lesson: StoryboardLesson;
  canGoPrevious: boolean;
  canGoNext: boolean;
  nextLabel: string;
  isSavingProgress: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onInlineQuizGateChange: (blockId: string, passed: boolean) => void;
};

export type InlineQuizRunnerProps = {
  block: StoryboardBlock;
  onGateChange: (passed: boolean) => void;
};

export type EvaluationRunnerProps = {
  evaluation: ModuleEvaluation | CourseEvaluation;
  enrollmentId: string;
  courseRecordId: string;
  courseSlug: string;
  scope: "MODULE" | "COURSE";
  moduleId?: string;
  previewMode?: boolean;
  onPass: () => void;
};

export type CourseRunnerProps = {
  enrollmentId: string;
  courseRecordId: string;
  course: CourseRunnerCourse;
  completedLessonIds: string[];
  passedModuleEvalIds: string[];
  courseEvalPassed: boolean;
  previewMode?: boolean;
};
