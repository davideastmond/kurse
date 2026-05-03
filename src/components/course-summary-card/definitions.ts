import { type CourseStatus } from "@/shared/types/storyboard";
export type DashboardCourse = {
  id: string;
  title: string;
  slug: string;
  status: CourseStatus;
  synopsis: string;
  estimatedDuration: string;
  enrolledCount: number;
  coverAccent: string;
  audience: string;
  createdAt: string;
  updatedAt: string;
  modules: unknown[];
  version: number;
};
