import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma/client";
import ExcelJS from "exceljs";

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED:       "Sin iniciar",
  DRAFT:             "Borrador",
  FINALIZED:         "Finalizado",
  FEEDBACK_RECEIVED: "Con observaciones",
  APPROVED:          "Aprobado por coordinador",
  PENDING_SIGNATURE: "Pendiente de firma",
  SIGNED:            "Firmado y aprobado",
  ADMIN_REJECTED:    "Rechazado por Admin",
};

const STATUS_COLOR: Record<string, string> = {
  NOT_STARTED:       "FFF0F0F0",
  DRAFT:             "FFedeeef",
  FINALIZED:         "FFe0f5ee",
  FEEDBACK_RECEIVED: "FFfff7ed",
  APPROVED:          "FFf0fdf4",
  PENDING_SIGNATURE: "FFdce8ff",
  SIGNED:            "FFccfbf1",
  ADMIN_REJECTED:    "FFffdad6",
};

interface ReportRow {
  teacherName: string;
  cedula:      string;
  subjectName: string;
  levelName:   string;
  levelCode:   string;
  periodName:  string;
  yearLabel:   string;
  status:      string;
  coordinator: string;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session)                      return new NextResponse("No autenticado",   { status: 401 });
  if (session.user.role !== "ADMIN") return new NextResponse("Acceso denegado",  { status: 403 });

  const { searchParams } = request.nextUrl;
  const rawYearId = searchParams.get("yearId"); // optional filter

  // Resolve year for context (title, "Sin iniciar" rows) — null = all years
  const filterYear = rawYearId
    ? await prisma.academicYear.findUnique({
        where:   { id: rawYearId },
        include: { periods: { orderBy: { number: "asc" } } },
      })
    : await prisma.academicYear.findFirst({
        where:   { active: true },
        include: { periods: { orderBy: { number: "asc" } } },
      });

  if (!filterYear) return new NextResponse("Año lectivo no encontrado", { status: 404 });

  // ── Fetch everything in parallel ────────────────────────────────────────────
  const [allPlans, activeAssignments, coordinatorAssignments] = await Promise.all([

    // All plans for the active/selected year
    prisma.planification.findMany({
      where: { academicYearId: filterYear.id },
      include: {
        teachers:     { where: { isEditor: true }, include: { teacher: { select: { id: true, name: true, email: true, cedula: true } } } },
        subject:      { select: { id: true, name: true } },
        level:        { select: { id: true, name: true, code: true, orderIndex: true } },
        period:       { select: { id: true, name: true, number: true } },
        academicYear: { select: { id: true, label: true } },
      },
      orderBy: [
        { academicYear: { yearStart: "desc" } },
        { period:       { number: "asc" } },
        { level:        { orderIndex: "asc" } },
        { subject:      { name: "asc" } },
      ],
    }),

    // Active assignments for "Sin iniciar" detection (only active year)
    prisma.teacherAssignment.findMany({
      where:   { academicYearId: filterYear.id, active: true },
      include: {
        teacher: { select: { id: true, name: true, email: true, cedula: true } },
        subject: { select: { id: true, name: true } },
        level:   { select: { id: true, name: true, code: true, orderIndex: true } },
      },
    }),

    // Coordinator → teacher mapping
    prisma.coordinatorAssignment.findMany({
      include: { coordinator: { select: { name: true, email: true } } },
    }),
  ]);

  // ── Build indexes ───────────────────────────────────────────────────────────

  const teacherToCoordinator = new Map<string, string>();
  for (const ca of coordinatorAssignments) {
    const label    = ca.coordinator.name ?? ca.coordinator.email;
    const existing = teacherToCoordinator.get(ca.teacherId);
    teacherToCoordinator.set(ca.teacherId, existing ? `${existing}, ${label}` : label);
  }

  // ── STEP 1: One row per existing plan ────────────────────────────────────────
  // coverKey = subjectId|levelId|periodId (plans are unique per this triplet)
  const coveredKeys = new Set<string>();
  const rows: ReportRow[] = [];

  for (const p of allPlans) {
    if (!p.period || !p.subject || !p.level) continue;
    const editor    = p.teachers[0]?.teacher;
    const editorId  = editor?.id ?? "";

    const coverKey = `${p.subjectId}|${p.levelId}|${p.periodId}`;
    coveredKeys.add(coverKey);

    rows.push({
      teacherName: editor ? (editor.name ?? editor.email) : "—",
      cedula:      editor?.cedula ?? "—",
      subjectName: p.subject.name,
      levelName:   p.level.name,
      levelCode:   p.level.code,
      periodName:  p.period.name,
      yearLabel:   filterYear.label,
      status:      p.status,
      coordinator: editorId ? (teacherToCoordinator.get(editorId) ?? "—") : "—",
    });
  }

  // ── STEP 2: "Sin iniciar" for active-year assignment × period combos ─────────
  // Group assignments by teacher+subject+level (deduplicated)
  type AssignInfo = { teacher: typeof activeAssignments[0]["teacher"]; subject: typeof activeAssignments[0]["subject"]; level: typeof activeAssignments[0]["level"] };
  const assignGroups = new Map<string, AssignInfo>();
  for (const a of activeAssignments) {
    const key = `${a.teacherId}|${a.subjectId}|${a.levelId}`;
    if (!assignGroups.has(key)) {
      assignGroups.set(key, { teacher: a.teacher, subject: a.subject, level: a.level });
    }
  }

  for (const [key, info] of assignGroups) {
    const [teacherId, subjectId, levelId] = key.split("|");
    for (const period of filterYear.periods) {
      const ck = `${subjectId}|${levelId}|${period.id}`;
      if (coveredKeys.has(ck)) continue; // plan exists → already in STEP 1

      rows.push({
        teacherName: info.teacher.name ?? info.teacher.email,
        cedula:      info.teacher.cedula ?? "—",
        subjectName: info.subject.name,
        levelName:   info.level.name,
        levelCode:   info.level.code,
        periodName:  period.name,
        yearLabel:   filterYear.label,
        status:      "NOT_STARTED",
        coordinator: teacherToCoordinator.get(teacherId) ?? "—",
      });
    }
  }

  // ── Sort: teacher → period → level → subject ────────────────────────────────
  const periodOrder = new Map(filterYear.periods.map((p, i) => [p.name, i]));
  rows.sort((a, b) => {
    const t = a.teacherName.localeCompare(b.teacherName);
    if (t !== 0) return t;
    const pa = periodOrder.get(a.periodName) ?? 99;
    const pb = periodOrder.get(b.periodName) ?? 99;
    if (pa !== pb) return pa - pb;
    const l = a.levelName.localeCompare(b.levelName);
    if (l !== 0) return l;
    return a.subjectName.localeCompare(b.subjectName);
  });

  // ── Build Excel workbook ────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator  = "PUM Web";
  wb.created  = new Date();
  wb.modified = new Date();

  const NCOLS = 9;

  const ws = wb.addWorksheet("Informe PUMs", {
    views: [{ state: "frozen", ySplit: 2 }],
  });

  // Title
  ws.mergeCells(1, 1, 1, NCOLS);
  const titleCell     = ws.getCell("A1");
  titleCell.value     = `Informe General de PUMs — ${filterYear.label}`;
  titleCell.font      = { bold: true, size: 13, color: { argb: "FF002753" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFdce8ff" } };
  ws.getRow(1).height = 28;

  // Headers
  const HEADERS = [
    { header: "Docente",      key: "teacherName", width: 30 },
    { header: "Cédula",       key: "cedula",      width: 14 },
    { header: "Materia",      key: "subjectName", width: 32 },
    { header: "Nivel",        key: "levelName",   width: 22 },
    { header: "Código nivel", key: "levelCode",   width: 14 },
    { header: "Trimestre",    key: "periodName",  width: 20 },
    { header: "Año lectivo",  key: "yearLabel",   width: 16 },
    { header: "Estado",       key: "status",      width: 26 },
    { header: "Coordinador",  key: "coordinator", width: 28 },
  ];

  ws.columns = HEADERS.map((h) => ({ key: h.key, width: h.width }));

  const headerRow = ws.getRow(2);
  HEADERS.forEach((h, idx) => {
    const cell     = headerRow.getCell(idx + 1);
    cell.value     = h.header;
    cell.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF002753" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border    = { bottom: { style: "thin", color: { argb: "FF003d7a" } } };
  });
  headerRow.height = 22;

  // Data rows
  const STATUS_COL = 8;

  rows.forEach((r, idx) => {
    const statusLabel = STATUS_LABEL[r.status] ?? r.status;
    const statusColor = STATUS_COLOR[r.status] ?? "FFedeeef";
    const rowBg       = idx % 2 === 0 ? "FFFFFFFF" : "FFF7F9FF";

    const row  = ws.addRow({ ...r, status: statusLabel });
    row.height = 18;

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.alignment = { vertical: "middle", wrapText: false };
      cell.font      = { size: 10, color: { argb: "FF1a1c1e" } };
      cell.border    = { bottom: { style: "hair", color: { argb: "FFe0e6f0" } } };
      if (colNum === STATUS_COL) {
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: statusColor } };
        cell.font      = { bold: true, size: 10, color: { argb: "FF1a1c1e" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      }
    });
  });

  // Summary
  ws.addRow([]);
  const signed   = rows.filter((r) => r.status === "SIGNED").length;
  const pending  = rows.filter((r) => r.status === "PENDING_SIGNATURE").length;
  const notStart = rows.filter((r) => r.status === "NOT_STARTED").length;
  const draft    = rows.filter((r) => r.status === "DRAFT").length;

  const summaryRow = ws.addRow([
    `Total: ${rows.length} registros`,
    "", "", "", "", "", "",
    `Firmadas: ${signed}  |  Pend. firma: ${pending}  |  Borrador: ${draft}  |  Sin iniciar: ${notStart}`,
    "",
  ]);
  summaryRow.eachCell({ includeEmpty: false }, (cell) => {
    cell.font = { bold: true, italic: true, size: 9, color: { argb: "FF002753" } };
  });

  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: NCOLS } };

  const buffer    = await wb.xlsx.writeBuffer();
  const safeLabel = filterYear.label.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9\-]/g, "");
  const filename  = `Informe_PUMs_${safeLabel}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control":       "no-store",
    },
  });
}
