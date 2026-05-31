export type AssignmentCourseOption = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export type AssignmentMemberOption = {
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export type AssignmentRecord = {
  userId: string;
  memberName: string;
  courseId: string;
  courseTitle: string;
  createdAtIso: string;
};

export type AssignmentPanelProps = {
  organizationId: string;
  courses: AssignmentCourseOption[];
  members: AssignmentMemberOption[];
  assignments: AssignmentRecord[];
};
