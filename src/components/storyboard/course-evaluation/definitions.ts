import type { CourseEvaluation } from "@/shared/types/storyboard";

export type CourseEvaluationCanvasProps = {
  evaluation: CourseEvaluation;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (evaluation: CourseEvaluation) => void;
  onDelete: () => void;
};
