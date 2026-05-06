import {
  CourseStatus,
  StoryboardBlock,
  StoryboardBlockType,
  StoryboardCoursePayload,
  StoryboardLesson,
  StoryboardModule,
  StoryboardQuiz,
} from "@/shared/types/storyboard";

export type {
  CourseStatus,
  StoryboardBlockType,
} from "@/shared/types/storyboard";

type PersistedCourseMeta = {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  version: number;
  synopsis: string;
  audience: string;
  estimatedDuration: string;
};

type PersistedModule = {
  id: string;
  title: string;
  progressLabel?: string;
  evaluationTitle?: string;
};

type PersistedLesson = {
  id: string;
  moduleId: string;
  title: string;
  duration: string;
  objective: string;
};

type PersistedBlock = {
  id: string;
  lessonId: string;
  type: StoryboardBlockType;
  title: string;
  detail: string;
  duration: string;
  fontSizePx?: number;
  videoUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  quiz?: StoryboardQuiz;
};

export type ApiBlock = StoryboardBlock;
export type ApiLesson = StoryboardLesson;
export type ApiModule = StoryboardModule;
export type ApiCoursePayload = StoryboardCoursePayload;

export type StoryboardValidationError = {
  code: "INVALID_FIELD" | "DUPLICATE_ID";
  path: string;
  message: string;
};

export type BuilderResult<T> =
  | {
      ok: true;
      value: T;
      errors: [];
    }
  | {
      ok: false;
      errors: StoryboardValidationError[];
    };

export type CourseStructureJsonb = {
  schemaVersion: 1;
  course: PersistedCourseMeta;
  moduleOrder: string[];
  lessonOrderByModule: Record<string, string[]>;
  blockOrderByLesson: Record<string, string[]>;
  modulesById: Record<string, PersistedModule>;
  lessonsById: Record<string, PersistedLesson>;
  blocksById: Record<string, PersistedBlock>;
};

export type StoryboardRenderBlock = PersistedBlock;

export type StoryboardRenderLesson = Omit<PersistedLesson, "moduleId"> & {
  blocks: StoryboardRenderBlock[];
};

export type StoryboardRenderModule = PersistedModule & {
  lessons: StoryboardRenderLesson[];
};

export type StoryboardRenderModel = {
  course: PersistedCourseMeta;
  modules: StoryboardRenderModule[];
};
