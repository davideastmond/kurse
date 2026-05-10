import type { ModuleEvaluation } from "@/shared/types/storyboard";

export type ModuleEvaluationCanvasProps = {
  evaluation: ModuleEvaluation;
  moduleId: string;
  readOnly?: boolean;
  onUpdate: (moduleId: string, evaluation: ModuleEvaluation) => void;
  onDelete: (moduleId: string) => void;
};
