// Tipos de la página de coordinadores (admin)

export interface TeacherOption {
  id:    string;
  name:  string | null;
  email: string;
}

export interface SubjectOption {
  id:   string;
  name: string;
  code: string;
}

export interface CoordinatorTeacher {
  assignmentId: string;
  teacherId:    string;
  teacherName:  string | null;
  teacherEmail: string;
  subjectCount: number;
}

export interface CoordinatorEntry {
  id:                 string;
  name:               string | null;
  email:              string;
  cedula:             string | null;
  coordinatorArea:    string | null;
  createdAt:          Date;
  teachers:           CoordinatorTeacher[];
  progress:           { total: number; approved: number };
  assignedSubjectIds: string[];
}
