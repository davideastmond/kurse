export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type StoryboardBlockType =
  | "video"
  | "richtext"
  | "image"
  | "quiz_inline"
  | "audio";

export type StoryboardBlock = {
  id: string;
  type: StoryboardBlockType;
  title: string;
  detail: string;
  duration: string;
};

export type StoryboardLesson = {
  id: string;
  title: string;
  duration: string;
  objective: string;
  blocks: StoryboardBlock[];
};

export type StoryboardModule = {
  id: string;
  title: string;
  progressLabel?: string;
  evaluationTitle?: string;
  lessons: StoryboardLesson[];
};

export type StoryboardCoursePayload = {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  version: number;
  synopsis: string;
  audience: string;
  estimatedDuration: string;
  modules: StoryboardModule[];
};
