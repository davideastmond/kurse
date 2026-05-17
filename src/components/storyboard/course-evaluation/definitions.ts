import type { CourseEvaluation } from "@/shared/types/storyboard";

export type CourseEvaluationCanvasProps = {
  evaluation: CourseEvaluation;
  courseRecordId: string;
  isSelected: boolean;
  readOnly?: boolean;
  onSelect: () => void;
  onUpdate: (evaluation: CourseEvaluation) => void;
  onDelete: () => void;
};
