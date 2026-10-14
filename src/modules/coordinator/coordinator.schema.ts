import { z } from "zod";
import { REVIEW_SECTION_KEYS } from "@/constants/review";
import { IdSchema } from "@/lib/validation/ids";

/** Clave de sección revisable: una sección fija o una fila ("row_0", "row_1"…). */
export const SectionKeySchema = z.union([
  z.enum(REVIEW_SECTION_KEYS),
  z.string().regex(/^row_\d{1,4}$/, "Sección inválida"),
]);

export const UpdateSectionSchema = z.object({
  reviewId:   IdSchema,
  sectionKey: SectionKeySchema,
  approved:   z.boolean(),
  comment:    z.string().trim().max(2000, "El comentario no puede superar 2000 caracteres").nullable(),
});

export const ClearFeedbackSchema = z.object({
  planId: IdSchema,
  keys:   z.array(SectionKeySchema).max(500),
});

export const CreateTeacherAssignmentSchema = z.object({
  teacherId:      IdSchema,
  subjectId:      IdSchema,
  levelId:        IdSchema,
  academicYearId: IdSchema,
});
