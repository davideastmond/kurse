import type { StoryboardQuiz } from "@/shared/types/storyboard";

export type QuizWizardProps = {
  initialQuiz?: StoryboardQuiz;
  onClose: () => void;
  onSave: (quiz: StoryboardQuiz) => void;
  onGenerateWithAi?: (numberOfQuestions: number) => Promise<StoryboardQuiz>;
  defaultAiQuestionCount?: number;
};

type QuizWizardOptionDraft = {
  id: string;
  text: string;
};

export type QuizWizardQuestionDraft = {
  id: string;
  prompt: string;
  options: QuizWizardOptionDraft[];
  correctOptionId: string;
};
