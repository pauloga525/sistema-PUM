import fs from "fs";
import path from "path";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma/client";
import { planificationService } from "@/modules/planification/planification.service";
import { appConfig } from "@/config/app.config";
import { ROUTES } from "@/constants/routes";
import { EJES_TRANSVERSALES, PRINCIPIO_COLORS } from "@/constants/planification";
import { ExportMenu } from "@/components/planification/ExportMenu";
import { BreadcrumbPUM } from "@/components/layout/BreadcrumbPUM";
import { SignatureBlock } from "@/components/planification/SignatureBlock";
import { auditService } from "@/modules/audit/audit.service";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ yearId: string; periodId: string; planId: string }>;
}) {
  const { planId } = await params;
  const plan = await prisma.planification.findUnique({
    where: { id: planId },
    include: { subject: true, level: true },
  });
  if (!plan) return { title: "Vista previa — PUM Web" };
  return { title: `Vista previa — ${plan.subject.name} ${plan.level.code}` };
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ yearId: string; periodId: string; planId: string }>;
}) {
  const { yearId, periodId, planId } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  let plan;
  try {
    plan = await planificationService.getById(planId, session.user.id);
  } catch {
    redirect(ROUTES.TEACHER.subjects(yearId, periodId));
  }

  const [subject, level, year, period] = await Promise.all([
    prisma.subject.findUnique({ where: { id: plan!.subjectId } }),
    prisma.level.findUnique({ where: { id: plan!.levelId } }),
    prisma.academicYear.findUnique({ where: { id: plan!.academicYearId } }),
    prisma.period.findUnique({ where: { id: plan!.periodId } }),
  ]);

  if (!subject || !level || !year || !period) notFound();

  const signatureBlock = plan!.status === "SIGNED"
    ? await auditService.getSignatureBlock(planId)
    : null;

  const meta = plan!.metadata;

  // Logos institucionales — opcionales, se muestran solo si existen en /public/logos/
  const publicDir = path.join(process.cwd(), "public");
  const hasLogoLeft  = fs.existsSync(path.join(publicDir, "logos", "logo-left.png"));
  const hasLogoRight = fs.existsSync(path.join(publicDir, "logos", "logo-right.png"));

  // Subnivel legible desde track
  const nivelSub = level.track === "BACHILLERATO" ? "Bachillerato"
    : level.track === "BASICA" ? "Educación Básica"
    : level.track;

  // Columnas tabla PUM
  const PUM_COLS = [
    { label: "¿Qué van a aprender?",   subtitle: "Destreza con Criterio de Desempeño / Competencia",                       width: "20%" },
    { label: "¿Qué evaluar?",          subtitle: "Indicadores de evaluación",                                               width: "17%" },
    { label: "¿Cómo van a aprender?",  subtitle: "Metodologías para los aprendizajes · Estrategias Metodológicas · DUA",   width: "25%" },
    { label: "Recursos",               subtitle: undefined,                                                                  width: "13%" },
    { label: "¿Cómo evaluar?",         subtitle: "Actividades de Evaluación / Técnicas / Instrumentos",                     width: "21%" },
  ] as const;

  return (
    <>
      {/* ── CSS de impresión ─────────────────────────────────────────────── */}
      <style>{`
        @page { size: A4 landscape; margin: 10mm 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; font-size: 9pt; }
          .print-page { padding: 0 !important; max-width: none !important; box-shadow: none !important; border-radius: 0 !important; border: none !important; }
          table { border-collapse: collapse !important; }
          .hdr-blue { background-color: #1E40AF !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .hdr-section { background-color: #BFDBFE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .hdr-green { background-color: #E0F2FE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .hdr-dua-p1 { background-color: #D1FAE5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .hdr-dua-p2 { background-color: #EDE9FE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .hdr-dua-p3 { background-color: #E0F2FE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pum-row-odd td { background-color: #F1F5F9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .badge-p1 { background-color: #059669 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .badge-p2 { background-color: #7C3AED !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .badge-p3 { background-color: #0EA5E9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .doc-table { page-break-inside: auto; }
          .doc-table tr { page-break-inside: avoid; }
        }
        .hdr-blue  { background-color: #1E40AF; }
        .hdr-section { background-color: #BFDBFE; }
        .hdr-green { background-color: #E0F2FE; }
        .hdr-dua-p1 { background-color: #D1FAE5; }
        .hdr-dua-p2 { background-color: #EDE9FE; }
        .hdr-dua-p3 { background-color: #E0F2FE; }
        .pum-row-odd td { background-color: #F1F5F9; }
        .badge-p1 { background-color: #059669; }
        .badge-p2 { background-color: #7C3AED; }
        .badge-p3 { background-color: #0EA5E9; }
        .doc-table { border-collapse: collapse; width: 100%; font-size: 0.72rem; }
        .doc-table td, .doc-table th { border: 1px solid #94A3B8; padding: 3px 5px; vertical-align: top; }
        .lbl { font-weight: 700; color: #1e3a8a; white-space: nowrap; }
        .badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 3px; padding: 1px 4px; font-size: 0.6rem; font-weight: 700; color: white; margin-right: 3px; flex-shrink: 0; }
      `}</style>

      <div className="flex-1 flex flex-col bg-pum-bg">

        {/* ── Barra superior (no se imprime) ───────────────────────────── */}
        <div className="no-print sticky top-0 z-10 bg-pum-surface border-b border-pum-border px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <BreadcrumbPUM
            items={[
              { label: "Años lectivos", href: ROUTES.TEACHER.YEAR },
              { label: year.label, href: ROUTES.TEACHER.period(yearId) },
              { label: period.name, href: ROUTES.TEACHER.subjects(yearId, periodId) },
              { label: subject.name, href: ROUTES.TEACHER.planification(yearId, periodId, planId) },
              { label: "Vista previa" },
            ]}
          />
          <ExportMenu planId={planId} showPrint />
        </div>

        {/* ── Documento ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex justify-center py-6 px-4">
          <div
            className="print-page bg-white shadow-pum-md rounded-lg w-full border border-gray-100"
            style={{ maxWidth: "1280px", padding: "20px 28px" }}
          >

            {/* ═══════════════════════════════════════════════════════════
                ENCABEZADO INSTITUCIONAL
            ═══════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-blue-800">
              {/* Logo izquierdo — colocar /public/logos/logo-left.png para habilitarlo */}
              <div className="w-20 h-16 flex items-center justify-center">
                {hasLogoLeft && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/logos/logo-left.png" alt="Logo" className="max-h-full max-w-full object-contain" />
                )}
              </div>

              <div className="text-center flex-1">
                <p className="font-extrabold text-blue-900 text-sm leading-tight uppercase tracking-wide">
                  {appConfig.institutionName}
                </p>
                <p className="font-bold text-blue-800 text-xs leading-tight uppercase mt-0.5">
                  {process.env.INSTITUTION_SUBNAME ?? ""}
                </p>
                <span className="inline-block mt-1 px-4 py-0.5 rounded-full text-xs font-bold text-blue-900"
                  style={{ backgroundColor: "#FEF08A" }}>
                  {year.label}
                </span>
              </div>

              {/* Logo derecho — colocar /public/logos/logo-right.png para habilitarlo */}
              <div className="w-20 h-16 flex items-center justify-center">
                {hasLogoRight && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/logos/logo-right.png" alt="Escudo" className="max-h-full max-w-full object-contain" />
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                TABLA PRINCIPAL DEL DOCUMENTO
            ═══════════════════════════════════════════════════════════ */}
            <table className="doc-table">

              {/* Título */}
              <thead>
                <tr>
                  <th colSpan={10} className="hdr-blue text-center text-white font-bold py-1.5" style={{ fontSize: "0.8rem" }}>
                    PLAN DE UNIDAD MICROCURRICULAR
                  </th>
                </tr>
              </thead>

              <tbody>

                {/* ── 1. DATOS INFORMATIVOS ─────────────────────────── */}
                <tr>
                  <td colSpan={10} className="hdr-section font-bold text-blue-900 py-1">
                    1.&nbsp; DATOS INFORMATIVOS
                  </td>
                </tr>

                {/* Nivel educativo */}
                <tr>
                  <td className="lbl" style={{ width: "13%" }}>NIVEL EDUCATIVO</td>
                  <td className="lbl" style={{ width: "7%" }}>Subnivel</td>
                  <td style={{ width: "20%" }}>{nivelSub}</td>
                  <td className="lbl" style={{ width: "7%" }}>Grados</td>
                  <td colSpan={6}>{level.name}</td>
                </tr>

                {/* Área y Asignatura */}
                <tr>
                  <td className="lbl">Área de Estudio</td>
                  <td colSpan={2}>{meta?.areaEstudio || <span className="text-gray-400">—</span>}</td>
                  <td className="lbl">Asignatura</td>
                  <td colSpan={6}>{subject.name}</td>
                </tr>

                {/* Docentes */}
                <tr>
                  <td className="lbl">Docentes</td>
                  <td colSpan={9}>
                    {plan!.teachers.length > 0
                      ? plan!.teachers.map((t) => t.name ?? "Docente").join(", ")
                      : (session.user?.name ?? "—")}
                  </td>
                </tr>

                {/* Número y Título */}
                <tr>
                  <td className="lbl" style={{ whiteSpace: "normal" }}>Número de la Unidad Microcurricular</td>
                  <td colSpan={2} className="text-center font-semibold">
                    {meta?.numUnidad || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="lbl" style={{ whiteSpace: "normal" }}>Título de la Unidad Microcurricular</td>
                  <td colSpan={6}>{meta?.titulo || <span className="text-gray-400">—</span>}</td>
                </tr>

                {/* Objetivos */}
                <tr>
                  <td className="lbl" style={{ whiteSpace: "normal" }}>Objetivos de la Unidad Microcurricular</td>
                  <td colSpan={9}>
                    {meta?.objetivos?.filter(Boolean).length ? (
                      <ul className="list-none m-0 p-0 space-y-0.5">
                        {meta.objetivos.filter(Boolean).map((o, i) => (
                          <li key={i}>• {o}</li>
                        ))}
                      </ul>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>

                {/* Criterios */}
                <tr>
                  <td className="lbl">Criterios de Evaluación</td>
                  <td colSpan={9}>
                    {meta?.criterios?.filter(Boolean).length ? (
                      <ul className="list-none m-0 p-0 space-y-0.5">
                        {meta.criterios.filter(Boolean).map((c, i) => (
                          <li key={i}>• {c}</li>
                        ))}
                      </ul>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>

                {/* ── 2. PLANIFICACIÓN ──────────────────────────────── */}
                <tr>
                  <td colSpan={10} className="hdr-section font-bold text-blue-900 py-1">
                    2.&nbsp; PLANIFICACIÓN
                  </td>
                </tr>

                {/* Periodos y fechas */}
                <tr>
                  <td className="lbl">Número de Periodos</td>
                  <td colSpan={2}>{meta?.nPeriodos || <span className="text-gray-400">—</span>}</td>
                  <td className="lbl">Fecha de inicio</td>
                  <td colSpan={2}>{meta?.fechInicio || <span className="text-gray-400">—</span>}</td>
                  <td className="lbl" colSpan={2}>Fecha de finalización</td>
                  <td colSpan={2}>{meta?.fechFin || <span className="text-gray-400">—</span>}</td>
                </tr>

                {/* Ejes Transversales */}
                <tr>
                  <td className="lbl">Ejes Transversales</td>
                  <td colSpan={9}>
                    {meta?.ejesTransversales || <span className="text-gray-400">—</span>}
                  </td>
                </tr>

                {/* ── APORTES MULTIMODALES ──────────────────────────── */}
                <tr>
                  <td colSpan={10} className="hdr-blue text-white font-bold text-center py-1">
                    APORTES MULTIMODALES A DESARROLLAR EN LA UNIDAD
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="hdr-blue text-white font-semibold text-center">
                    Dimensión y Opción Transversal
                  </td>
                  <td colSpan={4} className="hdr-blue text-white font-semibold text-center">
                    Aporte Multimodal del Nivel / Subnivel
                  </td>
                  <td colSpan={3} className="hdr-blue text-white font-semibold text-center">
                    ¿Cómo van a aprender?
                  </td>
                </tr>
                {(meta?.aportes?.length ? meta.aportes : Array(6).fill({ dim: "", aporte: "", como: "" })).map(
                  (ap: { dim: string; aporte: string; como: string }, i: number) => (
                    <tr key={i} className={i % 2 === 1 ? "pum-row-odd" : ""}>
                      <td colSpan={3}>{ap.dim || <span className="text-gray-300">—</span>}</td>
                      <td colSpan={4}>{ap.aporte || <span className="text-gray-300">—</span>}</td>
                      <td colSpan={3}>{ap.como || <span className="text-gray-300">—</span>}</td>
                    </tr>
                  )
                )}

                {/* ── DUA ──────────────────────────────────────────── */}
                <tr>
                  <td colSpan={10} className="hdr-blue text-white font-bold text-center py-1">
                    DISEÑO UNIVERSAL DEL APRENDIZAJE
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} className="hdr-blue text-white font-semibold text-center">Colorimetría</td>
                  <td colSpan={5} className="hdr-blue text-white font-semibold text-center">Principio</td>
                  <td colSpan={3} className="hdr-blue text-white font-semibold text-center">Pautas</td>
                </tr>

                {/* P1 */}
                <tr>
                  <td colSpan={2} className="hdr-dua-p1" style={{ minWidth: "40px" }}>&nbsp;</td>
                  <td colSpan={5}>
                    <span className="font-bold">P I:</span> PROVEER MÚLTIPLES FORMAS DE REPRESENTACIÓN
                  </td>
                  <td colSpan={3}>
                    {meta?.p1Pautas?.filter(Boolean).length ? (
                      <ul className="list-none m-0 p-0 space-y-0.5">
                        {meta.p1Pautas.filter(Boolean).map((p, i) => <li key={i}>• {p}</li>)}
                      </ul>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>

                {/* P2 */}
                <tr>
                  <td colSpan={2} className="hdr-dua-p2">&nbsp;</td>
                  <td colSpan={5}>
                    <span className="font-bold">P II:</span> OFRECER MÚLTIPLES MEDIOS PARA LA ACCIÓN Y EXPRESIÓN
                  </td>
                  <td colSpan={3}>
                    {meta?.p2Pautas?.filter(Boolean).length ? (
                      <ul className="list-none m-0 p-0 space-y-0.5">
                        {meta.p2Pautas.filter(Boolean).map((p, i) => <li key={i}>• {p}</li>)}
                      </ul>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>

                {/* P3 */}
                <tr>
                  <td colSpan={2} className="hdr-dua-p3">&nbsp;</td>
                  <td colSpan={5}>
                    <span className="font-bold">P III:</span> PROPORCIONAR MÚLTIPLES MEDIOS PARA LA MOTIVACIÓN E IMPLICACIÓN EN EL APRENDIZAJE
                  </td>
                  <td colSpan={3}>
                    {meta?.p3Pautas?.filter(Boolean).length ? (
                      <ul className="list-none m-0 p-0 space-y-0.5">
                        {meta.p3Pautas.filter(Boolean).map((p, i) => <li key={i}>• {p}</li>)}
                      </ul>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                </tr>

              </tbody>
            </table>

            {/* ═══════════════════════════════════════════════════════════
                TABLA PUM PRINCIPAL
            ═══════════════════════════════════════════════════════════ */}
            <table className="doc-table mt-3">
              <thead>
                <tr>
                  <th className="hdr-blue text-white text-center" style={{ width: "4%" }}>#</th>
                  {PUM_COLS.map((col) => (
                    <th
                      key={col.label}
                      className="hdr-blue text-white text-left"
                      style={{ width: col.width }}
                    >
                      <span className="font-bold">{col.label}</span>
                      {col.subtitle && (
                        <span className="block mt-0.5 font-normal italic" style={{ fontSize: "0.62rem", opacity: 0.88 }}>
                          {col.subtitle}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plan!.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-6">
                      Sin filas registradas
                    </td>
                  </tr>
                ) : (
                  plan!.rows.map((row, i) => {
                    const isOdd = i % 2 === 1;
                    const ejeInfos = (row.data.ejeTransversales ?? [])
                      .map((id) => EJES_TRANSVERSALES.find((e) => e.id === id))
                      .filter(Boolean) as typeof EJES_TRANSVERSALES[number][];

                    return (
                      <tr key={row.id} className={isOdd ? "pum-row-odd" : ""}>

                        {/* # */}
                        <td className="text-center text-gray-500 align-top">{i + 1}</td>

                        {/* ¿Qué van a aprender? — DCD + ejes */}
                        <td className="align-top">
                          <span className="whitespace-pre-wrap leading-snug">
                            {row.data.dcd || <span className="text-gray-300">—</span>}
                          </span>
                          {ejeInfos.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ejeInfos.map((ejeInfo) => (
                                <img
                                  key={ejeInfo.id}
                                  src={`/icons/ejes-transversales/${ejeInfo.file}`}
                                  alt={ejeInfo.label}
                                  title={ejeInfo.label}
                                  width={14}
                                  height={14}
                                  className="w-[14px] h-[14px] object-contain shrink-0"
                                />
                              ))}
                            </div>
                          )}
                        </td>

                        {/* ¿Qué evaluar? — indicadores */}
                        <td className="align-top">
                          {row.data.indicators.filter(Boolean).length > 0 ? (
                            <ul className="list-none m-0 p-0 space-y-0.5">
                              {row.data.indicators.filter(Boolean).map((t, j) => (
                                <li key={j} className="leading-snug">• {t}</li>
                              ))}
                            </ul>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* ¿Cómo van a aprender? — metodología + badges */}
                        <td className="align-top">
                          {row.data.methodologyItems.filter((m) => m.text).length > 0 ? (
                            <ul className="list-none m-0 p-0 space-y-1">
                              {row.data.methodologyItems.filter((m) => m.text).map((item, j) => (
                                <li key={j} className="flex items-start gap-1">
                                  {item.principle && (
                                    <span
                                      className={`badge badge-p${item.principle.principio}`}
                                      style={{
                                        backgroundColor: PRINCIPIO_COLORS[item.principle.principio as 1 | 2 | 3],
                                      }}
                                    >
                                      P{item.principle.principio}.{(item.principle.numeros ?? [(item.principle as unknown as {numero?: number}).numero ?? 1]).join(",")}
                                    </span>
                                  )}
                                  <span className="leading-snug">{item.text}</span>
                                </li>
                              ))}
                            </ul>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* Recursos */}
                        <td className="align-top">
                          {row.data.resources.filter(Boolean).length > 0 ? (
                            <ul className="list-none m-0 p-0 space-y-0.5">
                              {row.data.resources.filter(Boolean).map((t, j) => (
                                <li key={j} className="leading-snug">• {t}</li>
                              ))}
                            </ul>
                          ) : <span className="text-gray-300">—</span>}
                        </td>

                        {/* ¿Cómo evaluar? */}
                        <td className="align-top">
                          {row.data.evaluations.filter(Boolean).length > 0 ? (
                            <ul className="list-none m-0 p-0 space-y-0.5">
                              {row.data.evaluations.filter(Boolean).map((t, j) => (
                                <li key={j} className="leading-snug">• {t}</li>
                              ))}
                            </ul>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Estado */}
            {plan!.status === "FINALIZED" && plan!.finalizedAt && (
              <p className="text-right mt-3" style={{ fontSize: "0.6rem", color: "#94a3b8" }}>
                Finalizado el{" "}
                {plan!.finalizedAt.toLocaleDateString("es-EC", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </p>
            )}

            {/* Membrete de firmas */}
            {signatureBlock && <SignatureBlock data={signatureBlock} />}
          </div>
        </div>

        {/* ── Volver (no se imprime) ───────────────────────────────────── */}
        <div className="no-print flex justify-center pb-6">
          <Link
            href={ROUTES.TEACHER.tabla(yearId, periodId, planId)}
            className="text-sm text-pum-primary hover:underline underline-offset-2"
          >
            ← Volver al editor
          </Link>
        </div>
      </div>
    </>
  );
}
