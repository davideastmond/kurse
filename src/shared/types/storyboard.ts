export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export const BLOCK_TYPES = [
  "video",
  "richtext",
  "image",
  "quiz_inline",
  "audio",
] as const;

export type StoryboardBlockType = (typeof BLOCK_TYPES)[number];

export type QuizOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
};

export type StoryboardQuiz = {
  title: string;
  questions: QuizQuestion[];
};

export type StoryboardBlock = {
  id: string;
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
  evaluation?: ModuleEvaluation;
};

export type ModuleEvaluation = {
  id: string;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
};

export type CourseEvaluation = {
  id: string;
  title: string;
  passingScore: number;
  questions: QuizQuestion[];
};

export type WelcomeScreenImage = {
  id: string;
  url: string;
  altText?: string;
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
  welcomeImages?: WelcomeScreenImage[];
  courseEvaluation?: CourseEvaluation;
  modules: StoryboardModule[];
};
