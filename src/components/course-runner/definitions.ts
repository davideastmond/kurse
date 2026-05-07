import type { ApiCoursePayload } from "@/app/utils/storyboard-builder/definitions";
import type {
  StoryboardBlock,
  StoryboardLesson,
  StoryboardModule,
} from "@/shared/types/storyboard";

export type CourseRunnerCourse = Pick<
  ApiCoursePayload,
  "id" | "title" | "slug" | "synopsis" | "estimatedDuration"
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
  unlockedLessonIds: Set<string>;
  completedLessonIds: Set<string>;
  onSelectLesson: (lessonId: string) => void;
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

export type CourseRunnerProps = {
  enrollmentId: string;
  course: CourseRunnerCourse;
  completedLessonIds: string[];
};
