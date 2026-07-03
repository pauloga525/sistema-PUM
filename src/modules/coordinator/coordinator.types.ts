import type { ReviewStatus, SectionStates } from "@/constants/review";

export interface TeacherAssignmentEntry {
  id:          string;
  subjectId:   string;
  subjectName: string;
  subjectCode: string;
  levelId:     string;
  levelName:   string;
  levelCode:   string;
  yearId:      string;
  yearLabel:   string;
}

export interface AssignedTeacher {
  id:          string;
  name:        string | null;
  email:       string;
  cedula:      string | null;
  assignments: TeacherAssignmentEntry[];
}

export interface PlanReviewSummary {
  reviewId: string | null;
  planificationId: string;
  status: ReviewStatus;
  sectionStates: SectionStates;
  approvedAt: Date | null;
  approvedSections: number;
  totalSections: number;
}

export interface FinalizedPlanEntry {
  planificationId: string;
  planStatus: string;
  teacherId: string;
  teacherName: string | null;
  teacherEmail: string;
  subjectName: string;
  levelName: string;
  levelCode: string;
  periodName: string;
  yearLabel: string;
  finalizedAt: Date | null;
  review: PlanReviewSummary;
  adminRejectionComment: string | null;
}
