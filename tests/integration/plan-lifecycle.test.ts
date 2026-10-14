import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma/client";
import { REVIEW_SECTION_KEYS } from "@/constants/review";
import { planificationService } from "@/modules/planification/planification.service";
import { coordinatorService } from "@/modules/coordinator/coordinator.service";
import { adminSignatureService } from "@/modules/admin/admin-signature.service";
import { adminUsersService } from "@/modules/admin/admin-users.service";
import { superAdminPlanService } from "@/modules/superadmin/superadmin-plan.service";
import { ErrorCode } from "@/lib/errors/error-codes";
import { assign, createCatalog, createUser, hasTestDb, planStatus, resetDb, row } from "./fixtures";

const TEACHER = "docente-1";
const CO_TEACHER = "docente-2";
const COORD = "coordinador-1";

type Catalog = Awaited<ReturnType<typeof createCatalog>>;

async function setup() {
  await resetDb();
  await Promise.all([createUser(TEACHER), createUser(CO_TEACHER), createUser(COORD, "COORDINATOR"), createUser("admin-1", "ADMIN")]);
  const catalog = await createCatalog();
  await assign(TEACHER, catalog, COORD);
  return catalog;
}

async function newPlan(catalog: Catalog, period = 0) {
  const { planId } = await planificationService.getOrCreatePlanification(
    TEACHER, catalog.year.id, catalog.periods[period].id, catalog.subject.id, catalog.level.id,
  );
  return planId;
}

async function finalize(planId: string, teacherId = TEACHER) {
  await planificationService.finalize({ planificationId: planId, confirmedByUser: true }, teacherId);
}

async function approveAllSections(reviewId: string, rowCount: number) {
  const states: Record<string, { approved: boolean; comment: null }> = {};
  for (const k of REVIEW_SECTION_KEYS) states[k] = { approved: true, comment: null };
  for (let i = 0; i < rowCount; i++) states[`row_${i}`] = { approved: true, comment: null };
  await prisma.planReview.update({ where: { id: reviewId }, data: { sectionStates: states } });
}

/** Lleva un PUM hasta PENDING_SIGNATURE por el camino normal. */
async function toPendingSignature(catalog: Catalog) {
  const planId = await newPlan(catalog);
  await planificationService.saveRows({ planificationId: planId, rows: [{ rowIndex: 0, data: row("a") }] }, TEACHER);
  await finalize(planId);
  const review = (await coordinatorService.getOrCreateReview(COORD, planId))!;
  await approveAllSections(review.id, 1);
  expect(await coordinatorService.approvePlan(review.id, COORD)).toBe(true);
  await coordinatorService.sendForSignature(planId, COORD);
  return { planId, reviewId: review.id };
}

describe.skipIf(!hasTestDb)("ciclo de vida del PUM", () => {
  let catalog: Catalog;
  beforeEach(async () => { catalog = await setup(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("crea el PUM con el docente como único editor y lo audita", async () => {
    const planId = await newPlan(catalog);
    const links = await prisma.planificationTeacher.findMany({ where: { planificationId: planId } });
    expect(links).toEqual([expect.objectContaining({ teacherId: TEACHER, isEditor: true })]);
    const events = await prisma.planAuditEvent.findMany({ where: { planificationId: planId } });
    expect(events.map((e) => e.eventType)).toEqual(["PLAN_CREATED"]);
  });

  it("saveRows solo reescribe las filas que cambiaron", async () => {
    const planId = await newPlan(catalog);
    await planificationService.saveRows({ planificationId: planId, rows: [
      { rowIndex: 0, data: row("a") }, { rowIndex: 1, data: row("b") },
    ] }, TEACHER);
    const before = await prisma.planificationRow.findUniqueOrThrow({
      where: { planificationId_rowIndex: { planificationId: planId, rowIndex: 0 } },
    });

    await planificationService.saveRows({ planificationId: planId, rows: [
      { rowIndex: 0, data: row("a") }, { rowIndex: 2, data: row("c") },
    ] }, TEACHER);

    const after = await prisma.planificationRow.findMany({ where: { planificationId: planId }, orderBy: { rowIndex: "asc" } });
    expect(after.map((r) => r.rowIndex)).toEqual([0, 2]);
    expect(after[0].id).toBe(before.id);
    expect(after[0].updatedAt).toEqual(before.updatedAt);
  });

  it("no se puede guardar ni finalizar dos veces un PUM finalizado", async () => {
    const planId = await newPlan(catalog);
    await planificationService.saveRows({ planificationId: planId, rows: [{ rowIndex: 0, data: row("a") }] }, TEACHER);
    await finalize(planId);
    expect((await planStatus(planId)).plan).toBe("FINALIZED");

    await expect(planificationService.saveRows({ planificationId: planId, rows: [] }, TEACHER))
      .rejects.toMatchObject({ code: ErrorCode.PLAN_ALREADY_FINALIZED });
    await expect(finalize(planId)).rejects.toMatchObject({ code: ErrorCode.PLAN_ALREADY_FINALIZED });
  });

  it("dos finalizaciones simultáneas: solo una aplica y queda un solo evento", async () => {
    const planId = await newPlan(catalog);
    await planificationService.saveRows({ planificationId: planId, rows: [{ rowIndex: 0, data: row("a") }] }, TEACHER);
    const results = await Promise.allSettled([finalize(planId), finalize(planId)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const finalized = await prisma.planAuditEvent.count({ where: { planificationId: planId, eventType: "FINALIZED" } });
    expect(finalized).toBe(1);
  });

  it("retroalimentación → reenvío → aprobación → firma", async () => {
    const planId = await newPlan(catalog);
    await planificationService.saveRows({ planificationId: planId, rows: [{ rowIndex: 0, data: row("a") }] }, TEACHER);
    await finalize(planId);
    const review = (await coordinatorService.getOrCreateReview(COORD, planId))!;

    expect(await coordinatorService.sendFeedback(review.id, COORD)).toBe(true);
    expect(await planStatus(planId)).toMatchObject({ plan: "FEEDBACK_RECEIVED", review: "FEEDBACK_SENT" });
    expect(await coordinatorService.sendFeedback(review.id, COORD)).toBe(false); // no se duplica

    await finalize(planId);
    expect(await planStatus(planId)).toMatchObject({ plan: "FINALIZED", review: "IN_REVIEW" });

    await approveAllSections(review.id, 1);
    expect(await coordinatorService.approvePlan(review.id, COORD)).toBe(true);
    await coordinatorService.sendForSignature(planId, COORD);
    await adminSignatureService.signPlan(planId, "admin-1", "Admin");
    expect(await planStatus(planId)).toMatchObject({ plan: "SIGNED", review: "APPROVED" });

    const events = await prisma.planAuditEvent.findMany({ where: { planificationId: planId }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => e.eventType)).toEqual([
      "PLAN_CREATED", "FINALIZED", "REVIEW_STARTED", "FEEDBACK_SENT", "TEACHER_RESUBMITTED",
      "PLAN_APPROVED", "SENT_FOR_SIGNATURE", "SIGNED",
    ]);
  });

  it("no se aprueba con secciones pendientes", async () => {
    const planId = await newPlan(catalog);
    await planificationService.saveRows({ planificationId: planId, rows: [{ rowIndex: 0, data: row("a") }] }, TEACHER);
    await finalize(planId);
    const review = (await coordinatorService.getOrCreateReview(COORD, planId))!;
    expect(await coordinatorService.approvePlan(review.id, COORD)).toBe(false);
    expect((await planStatus(planId)).plan).toBe("FINALIZED");
  });

  it("rechazo del admin: guarda el comentario y se limpia al reenviar", async () => {
    const { planId } = await toPendingSignature(catalog);
    await adminSignatureService.rejectPlan(planId, "Falta el anexo", "admin-1", "Admin");
    expect(await planStatus(planId)).toEqual({ plan: "ADMIN_REJECTED", review: "IN_REVIEW", rejection: "Falta el anexo" });

    await coordinatorService.sendForSignature(planId, COORD);
    expect(await planStatus(planId)).toEqual({ plan: "PENDING_SIGNATURE", review: "APPROVED", rejection: null });
  });

  it("el admin ve para firmar el PUM de un coordinador vinculado solo por la asignación", async () => {
    const { planId } = await toPendingSignature(catalog);
    expect(await prisma.coordinatorAssignment.count()).toBe(0);
    const groups = await adminSignatureService.getPendingSignaturePlans(catalog.year.id);
    expect(groups).toEqual([expect.objectContaining({
      coordinatorId: COORD,
      plans: [expect.objectContaining({ planId })],
    })]);
    const overview = await adminSignatureService.getCoordinatorOverview(catalog.year.id);
    expect(overview.find((o) => o.coordinatorId === COORD)).toMatchObject({ pendingSignature: 1, teacherCount: 1 });
  });

  it("reenviar a firma un PUM que ya está pendiente informa que no se aplicó", async () => {
    const { planId } = await toPendingSignature(catalog);
    expect(await coordinatorService.sendForSignature(planId, COORD)).toBe(false);
  });

  it("un PUM firmado no puede rechazarse ni firmarse otra vez", async () => {
    const { planId } = await toPendingSignature(catalog);
    await adminSignatureService.signPlan(planId);
    await expect(adminSignatureService.rejectPlan(planId, "x"))
      .rejects.toMatchObject({ code: ErrorCode.PLAN_INVALID_TRANSITION });
    await expect(adminSignatureService.signPlan(planId))
      .rejects.toMatchObject({ code: ErrorCode.PLAN_INVALID_TRANSITION });
    expect((await planStatus(planId)).plan).toBe("SIGNED");
  });

  it("corrección de SuperAdmin sincroniza la revisión y exige un estado distinto", async () => {
    const { planId } = await toPendingSignature(catalog);
    await superAdminPlanService.correctPlanStatus("admin-1", "SA", planId, { newStatus: "FEEDBACK_RECEIVED", reason: "corrección de prueba" });
    expect(await planStatus(planId)).toMatchObject({ plan: "FEEDBACK_RECEIVED", review: "FEEDBACK_SENT" });
    await expect(superAdminPlanService.correctPlanStatus("admin-1", "SA", planId, { newStatus: "FEEDBACK_RECEIVED", reason: "otra vez lo mismo" }))
      .rejects.toMatchObject({ code: ErrorCode.VAL_INVALID_INPUT });
  });
});

describe.skipIf(!hasTestDb)("vínculos docente ↔ PUM", () => {
  let catalog: Catalog;
  beforeEach(async () => { catalog = await setup(); });

  it("la base impide dos editores en un mismo PUM", async () => {
    const planId = await newPlan(catalog);
    await expect(prisma.planificationTeacher.create({
      data: { planificationId: planId, teacherId: CO_TEACHER, isEditor: true },
    })).rejects.toMatchObject({ code: "P2002" });
  });

  it("un co-docente asignado después queda vinculado como espectador al listar", async () => {
    const planId = await newPlan(catalog);
    await assign(CO_TEACHER, catalog);
    const subjects = await planificationService.getSubjectsWithStatus(CO_TEACHER, catalog.year.id, catalog.periods[0].id);
    expect(subjects[0].planification?.id).toBe(planId);
    const link = await prisma.planificationTeacher.findUniqueOrThrow({
      where: { planificationId_teacherId: { planificationId: planId, teacherId: CO_TEACHER } },
    });
    expect(link.isEditor).toBe(false);
  });

  it("al quitar al editor se promueve al co-docente", async () => {
    const planId = await newPlan(catalog);
    await assign(CO_TEACHER, catalog);
    await planificationService.getSubjectsWithStatus(CO_TEACHER, catalog.year.id, catalog.periods[0].id);
    const editorAssignment = await prisma.teacherAssignment.findFirstOrThrow({ where: { teacherId: TEACHER } });

    const result = await planificationService.unassignTeacherFromCombo({
      assignmentId: editorAssignment.id, actorId: "admin-1", actorName: "Admin", actorRole: "ADMIN",
    });
    expect(result).toEqual({ ok: true });
    const links = await prisma.planificationTeacher.findMany({ where: { planificationId: planId } });
    expect(links).toEqual([expect.objectContaining({ teacherId: CO_TEACHER, isEditor: true })]);
  });

  it("eliminar un docente lo desactiva y conserva sus PUM", async () => {
    const planId = await newPlan(catalog);
    await assign(CO_TEACHER, catalog);
    await adminUsersService.deleteTeacher(TEACHER, { actorId: "admin-1", actorName: "Admin" });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: TEACHER } });
    expect(user.isActive).toBe(false);
    expect(await prisma.planification.count({ where: { id: planId } })).toBe(1);
    const editor = await prisma.planificationTeacher.findFirstOrThrow({ where: { planificationId: planId, isEditor: true } });
    expect(editor.teacherId).toBe(CO_TEACHER);
  });

  it("no se elimina al único editor de un PUM en curso", async () => {
    await newPlan(catalog);
    await expect(adminUsersService.deleteTeacher(TEACHER, { actorId: "admin-1", actorName: "Admin" }))
      .rejects.toMatchObject({ code: ErrorCode.VAL_INVALID_INPUT });
    expect((await prisma.user.findUniqueOrThrow({ where: { id: TEACHER } })).isActive).toBe(true);
  });
});
