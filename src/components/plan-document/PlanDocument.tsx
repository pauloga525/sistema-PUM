import { Fragment, type CSSProperties, type ReactNode } from "react";
import { ALL_EJES, DUA_PRINCIPIOS } from "@/constants/planification";
import type { AnySectionKey, ReviewSectionKey } from "@/constants/review";
import type { PlanMetadata, PumRowData } from "@/modules/planification/planification.types";
import { PlanDocumentStyles } from "./PlanDocumentStyles";
import { Dash, ItemList, PrincipioBadges } from "./parts";

/**
 * Documento PUM (encabezado institucional, datos informativos, DUA y tabla PUM).
 *
 * Compartido por la vista previa del docente (sin `review`) y la pantalla de
 * revisión de coordinador/admin (con `review`), que agrega los controles de
 * aprobación/comentario por sección, la columna "Revisar fila" y el resaltado
 * de filas comentadas. Sin hooks: sirve como Server o Client Component.
 */

export interface PlanDocumentData {
  subjectName: string;
  levelName:   string;
  levelTrack:  string;
  yearLabel:   string;
  /** Docentes ya formateados para mostrar. */
  teacherNames: string;
  metadata:    PlanMetadata | null;
  rows:        Array<{ id: string; data: PumRowData }>;
}

export interface SectionControlOptions {
  /** El control se dibuja sobre fondo azul oscuro. */
  darkBg?: boolean;
  showInlineComment?: boolean;
}

export interface PlanDocumentReview {
  /** Control de revisión (aprobar / comentar) para una sección. */
  renderControl: (key: AnySectionKey, options?: SectionControlOptions) => ReactNode;
  /** Comentario del coordinador en una fila PUM; si existe, la fila se resalta. */
  rowComment: (key: `row_${number}`) => string | null | undefined;
}

interface PlanDocumentProps {
  institutionName: string;
  /** Subtítulo institucional (solo vista previa del docente). */
  institutionSubname?: string;
  logos: { left: boolean; right: boolean };
  plan: PlanDocumentData;
  review?: PlanDocumentReview;
  /** Contenido al final del documento (fecha de finalización, firmas). */
  children?: ReactNode;
}

const FLEX_CELL: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" };

// Columnas de la tabla PUM — anchos distintos con y sin la columna "Revisar fila"
const PUM_COLS: { label: string; subtitle?: string; key: ReviewSectionKey; width: string; reviewWidth: string }[] = [
  { label: "¿Qué van a aprender?",  subtitle: "Destreza con Criterio de Desempeño / Competencia",                     width: "20%", reviewWidth: "15%", key: "pum_dcd" },
  { label: "¿Qué evaluar?",         subtitle: "Indicadores de evaluación",                                             width: "17%", reviewWidth: "13%", key: "pum_indicators" },
  { label: "¿Cómo van a aprender?", subtitle: "Metodologías para los aprendizajes · Estrategias Metodológicas · DUA", width: "25%", reviewWidth: "26%", key: "pum_methodology" },
  { label: "Recursos",              subtitle: undefined,                                                                width: "13%", reviewWidth: "17%", key: "pum_resources" },
  { label: "¿Cómo evaluar?",        subtitle: "Actividades de Evaluación / Técnicas / Instrumentos",                   width: "21%", reviewWidth: "18%", key: "pum_evaluations" },
];

const DUA_ROWS = [
  { key: "dua_p1", color: "hdr-dua-p1", label: "P I:",   desc: "PROVEER MÚLTIPLES FORMAS DE REPRESENTACIÓN", field: "p1", pIdx: 0 },
  { key: "dua_p2", color: "hdr-dua-p2", label: "P II:",  desc: "OFRECER MÚLTIPLES MEDIOS PARA LA ACCIÓN Y EXPRESIÓN", field: "p2", pIdx: 1 },
  { key: "dua_p3", color: "hdr-dua-p3", label: "P III:", desc: "PROPORCIONAR MÚLTIPLES MEDIOS PARA LA MOTIVACIÓN E IMPLICACIÓN EN EL APRENDIZAJE", field: "p3", pIdx: 2 },
] as const;

const EMPTY_APORTES = Array(6).fill({ dim: "", aporte: "", como: "" }) as { dim: string; aporte: string; como: string }[];

export function PlanDocument({ institutionName, institutionSubname, logos, plan, review, children }: PlanDocumentProps) {
  const meta = plan.metadata;
  const isReview = !!review;

  // Subnivel — prioriza el valor ingresado por el docente
  const nivelSub = meta?.nivelSubnivelOverride
    || (plan.levelTrack === "BACHILLERATO" ? "Bachillerato"
      : plan.levelTrack === "BASICA" ? "Educación Básica"
      : plan.levelTrack);
  const nivelGrado = meta?.nivelGradoOverride || plan.levelName;

  /** Celda con control de revisión a la derecha (solo en modo revisión). */
  const withControl = (key: AnySectionKey, content: ReactNode, block = false) =>
    review ? (
      <div style={FLEX_CELL}>
        {block ? <div>{content}</div> : <span>{content}</span>}
        {review.renderControl(key)}
      </div>
    ) : content;

  /** Encabezado de aportes: <th> con control en revisión, <td> en vista previa. */
  const aportesHeader = (key: AnySectionKey, colSpan: number, label: string) => {
    const className = "hdr-blue text-white font-semibold text-center";
    return review ? (
      <th className={className} colSpan={colSpan}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <span>{label}</span>
          {review.renderControl(key, { darkBg: true })}
        </div>
      </th>
    ) : (
      <td colSpan={colSpan} className={className}>{label}</td>
    );
  };

  const liClass = isReview ? "whitespace-pre-wrap" : undefined;

  return (
    <>
      <PlanDocumentStyles variant={isReview ? "review" : "preview"} />

      <div className={isReview ? "flex justify-center py-6 px-4 pb-16" : "flex-1 flex justify-center py-6 px-4"}>
        <div
          className={`${isReview ? "" : "print-page "}bg-white shadow-pum-md rounded-lg w-full border border-gray-100`}
          style={{ maxWidth: "1280px", padding: "20px 28px" }}
        >
          {/* Encabezado institucional — logos opcionales en /public/logos/ */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-blue-800">
            <div className="w-20 h-16 flex items-center justify-center">
              {logos.left && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logos/logo-left.png" alt="Logo" className="max-h-full max-w-full object-contain" />
              )}
            </div>
            <div className="text-center flex-1">
              <p className={`font-extrabold text-blue-900 text-sm ${isReview ? "" : "leading-tight "}uppercase tracking-wide`}>
                {institutionName}
              </p>
              {institutionSubname !== undefined && (
                <p className="font-bold text-blue-800 text-xs leading-tight uppercase mt-0.5">{institutionSubname}</p>
              )}
              <span className="inline-block mt-1 px-4 py-0.5 rounded-full text-xs font-bold text-blue-900" style={{ backgroundColor: "#FEF08A" }}>
                {plan.yearLabel}
              </span>
            </div>
            <div className="w-20 h-16 flex items-center justify-center">
              {logos.right && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/logos/logo-right.png" alt="Escudo" className="max-h-full max-w-full object-contain" />
              )}
            </div>
          </div>

          {/* Tabla principal */}
          <table className="doc-table">
            <thead>
              <tr>
                <th colSpan={10} className="hdr-blue text-center text-white font-bold py-1.5" style={{ fontSize: "0.8rem" }}>
                  PLAN DE UNIDAD MICROCURRICULAR
                </th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Datos informativos */}
              <tr><td colSpan={10} className="hdr-section font-bold text-blue-900 py-1">1.&nbsp; DATOS INFORMATIVOS</td></tr>
              <tr>
                <td className="lbl" style={{ width: "13%" }}>NIVEL EDUCATIVO</td>
                <td className="lbl" style={{ width: "7%" }}>Subnivel</td>
                <td style={{ width: "20%" }}>{nivelSub}</td>
                <td className="lbl" style={{ width: "7%" }}>Grados</td>
                <td colSpan={6}>{withControl("meta_nivel", nivelGrado)}</td>
              </tr>
              <tr>
                <td className="lbl">Área de Estudio</td>
                <td colSpan={2}>{meta?.areaEstudio || <Dash />}</td>
                <td className="lbl">Asignatura</td>
                <td colSpan={6}>{withControl("meta_area", plan.subjectName)}</td>
              </tr>
              <tr>
                <td className="lbl">Docentes</td>
                <td colSpan={9}>{withControl("meta_docentes", plan.teacherNames)}</td>
              </tr>
              <tr>
                <td className="lbl" style={{ whiteSpace: "normal" }}>Número de la Unidad Microcurricular</td>
                <td colSpan={2} className="text-center font-semibold">{meta?.numUnidad || <Dash />}</td>
                <td className="lbl" style={{ whiteSpace: "normal" }}>Título de la Unidad Microcurricular</td>
                <td colSpan={6}>{withControl("meta_unidad", meta?.titulo || <Dash />)}</td>
              </tr>
              <tr>
                <td className="lbl" style={{ whiteSpace: "normal" }}>Objetivos de la Unidad Microcurricular</td>
                <td colSpan={9}>
                  {withControl("meta_objetivos", <BulletList items={meta?.objetivos} liClassName={liClass} />, true)}
                </td>
              </tr>
              <tr>
                <td className="lbl">Criterios de Evaluación</td>
                <td colSpan={9}>
                  {withControl("meta_criterios", <BulletList items={meta?.criterios} liClassName={liClass} />, true)}
                </td>
              </tr>

              {/* 2. Planificación */}
              <tr><td colSpan={10} className="hdr-section font-bold text-blue-900 py-1">2.&nbsp; PLANIFICACIÓN</td></tr>
              <tr>
                <td className="lbl">Número de Periodos</td>
                <td colSpan={2}>{meta?.nPeriodos || <Dash />}</td>
                <td className="lbl">Fecha de inicio</td>
                <td colSpan={2}>{meta?.fechInicio || <Dash />}</td>
                <td className="lbl" colSpan={2}>Fecha de finalización</td>
                <td colSpan={2}>{withControl("plan_periodos", meta?.fechFin || <Dash />)}</td>
              </tr>
              <tr>
                <td className="lbl">Ejes Transversales</td>
                <td colSpan={9}>{withControl("plan_ejes", meta?.ejesTransversales || <Dash />)}</td>
              </tr>

              {/* Aportes multimodales */}
              <tr>
                <td colSpan={10} className="hdr-blue text-white font-bold text-center py-1">
                  APORTES MULTIMODALES A DESARROLLAR EN LA UNIDAD
                </td>
              </tr>
              <tr>
                {aportesHeader("aportes_dim", 3, "Dimensión y Opción Transversal")}
                {aportesHeader("aportes_nivel", 4, "Aporte Multimodal del Nivel / Subnivel")}
                {aportesHeader("aportes_como", 3, "¿Cómo van a aprender?")}
              </tr>
              {(meta?.aportes?.length ? meta.aportes : EMPTY_APORTES).map((ap, i) => (
                <tr key={i} className={i % 2 === 1 ? "pum-row-odd" : ""}>
                  <td colSpan={3}>{ap.dim || <Dash light />}</td>
                  <td colSpan={4}>{ap.aporte || <Dash light />}</td>
                  <td colSpan={3}>{ap.como || <Dash light />}</td>
                </tr>
              ))}

              {/* DUA */}
              <tr>
                <td colSpan={10} className="hdr-blue text-white font-bold text-center py-1">DISEÑO UNIVERSAL DEL APRENDIZAJE</td>
              </tr>
              <tr>
                <td colSpan={2} className="hdr-blue text-white font-semibold text-center">Colorimetría</td>
                <td colSpan={2} className="hdr-blue text-white font-semibold text-center">Principio</td>
                <td colSpan={6} className="hdr-blue text-white font-semibold text-center">Pautas</td>
              </tr>
              {DUA_ROWS.map((p) => (
                <tr key={p.key}>
                  <td
                    colSpan={2}
                    className={p.color}
                    style={isReview || p.pIdx === 0 ? { minWidth: "40px" } : undefined}
                  >
                    &nbsp;
                  </td>
                  <td colSpan={2}>
                    <span className="font-bold">{p.label}</span> {p.desc}
                  </td>
                  <td colSpan={6}>
                    {withControl(p.key, <DuaPautas sel={meta?.[p.field] ?? null} pIdx={p.pIdx} />, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tabla PUM */}
          <table className="doc-table mt-3">
            <thead>
              <tr>
                <th className="hdr-blue text-white text-center" style={{ width: isReview ? "3%" : "4%" }}>#</th>
                {PUM_COLS.map((col) => (
                  <th key={col.key} className="hdr-blue text-white text-left" style={{ width: isReview ? col.reviewWidth : col.width }}>
                    {isReview ? (
                      <>
                        <span style={{ fontWeight: 700 }}>{col.label}</span>
                        {col.subtitle && (
                          <span style={{ display: "block", marginTop: "2px", fontSize: "0.6rem", fontWeight: 400, fontStyle: "italic", opacity: 0.88 }}>
                            {col.subtitle}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-bold">{col.label}</span>
                        {col.subtitle && (
                          <span className="block mt-0.5 font-normal italic" style={{ fontSize: "0.62rem", opacity: 0.88 }}>
                            {col.subtitle}
                          </span>
                        )}
                      </>
                    )}
                  </th>
                ))}
                {isReview && (
                  <th className="hdr-blue text-white text-center" style={{ width: "8%", fontSize: "0.65rem" }}>
                    Revisar fila
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {plan.rows.length === 0 ? (
                <tr>
                  <td colSpan={isReview ? 7 : 6} className="text-center text-gray-400 py-6">Sin filas registradas</td>
                </tr>
              ) : (
                plan.rows.map((row, i) => {
                  const rowKey = `row_${i}` as const;
                  const comment = review?.rowComment(rowKey);
                  const isOdd = i % 2 === 1;
                  const methodologyEmpty = !row.data.methodologyItems.some((m) => m.text);

                  return (
                    <Fragment key={row.id}>
                      <tr className={comment ? "pum-row-commented" : isOdd ? "pum-row-odd" : ""}>
                        <td className="text-center text-gray-500 align-top">{i + 1}</td>
                        <td className="align-top"><DcdCell items={row.data.dcdItems} compact={isReview} /></td>
                        <td className="align-top"><ItemList items={row.data.indicators} /></td>
                        <td className="align-top" style={isReview && methodologyEmpty ? { backgroundColor: "#D9D9D9" } : {}}>
                          <SubItemList items={row.data.methodologyItems} printBadges={!isReview} />
                        </td>
                        <td className="align-top"><SubItemList items={row.data.resources} /></td>
                        <td className="align-top"><ItemList items={row.data.evaluations} /></td>
                        {review && (
                          <td className="align-top">{review.renderControl(rowKey, { showInlineComment: false })}</td>
                        )}
                      </tr>

                      {/* Comentario de la fila — debajo de la fila afectada, a todo el ancho */}
                      {comment && (
                        <tr className="pum-row-comment-bar">
                          <td colSpan={7} style={{ padding: "5px 10px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                              <span style={{ fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>💬</span>
                              <span style={{ fontSize: "11px", color: "#9a3412", fontStyle: "italic", lineHeight: "1.4" }}>
                                {comment}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          {children}
        </div>
      </div>
    </>
  );
}

// ── Celdas ─────────────────────────────────────────────────────────────────────

function BulletList({ items, liClassName }: { items: string[] | undefined; liClassName?: string }) {
  const filled = items?.filter(Boolean) ?? [];
  if (!filled.length) return <Dash />;
  return (
    <ul className="list-none m-0 p-0 space-y-0.5">
      {filled.map((t, i) => <li key={i} className={liClassName}>• {t}</li>)}
    </ul>
  );
}

function DuaPautas({ sel, pIdx }: { sel: PlanMetadata["p1"]; pIdx: number }) {
  const entries = sel?.filter((e) => e.subPautas.length > 0).sort((a, b) => a.pauta - b.pauta) ?? [];
  if (!entries.length) return <Dash />;
  return (
    <ul className="list-none m-0 p-0 space-y-1">
      {entries.map((entry) => {
        const pd = DUA_PRINCIPIOS[pIdx].pautas.find((x) => x.num === entry.pauta);
        return (
          <li key={entry.pauta}>
            • {pd?.label ?? `Pauta ${entry.pauta}`}
            {entry.subPautas.map((sn) => {
              const sp = pd?.subPautas.find((s) => s.num === sn);
              return <div key={sn} className="pl-3">– P{pIdx + 1}:{entry.pauta}.{sn} {sp?.label ?? ""}</div>;
            })}
          </li>
        );
      })}
    </ul>
  );
}

function DcdCell({ items, compact }: { items: PumRowData["dcdItems"]; compact: boolean }) {
  const filled = items.filter((d) => d.text);
  if (!filled.length) return <Dash light />;
  return (
    <div className="flex flex-col gap-2">
      {filled.map((dcdItem, j) => {
        const ejeInfos = dcdItem.ejes
          .map((id) => ALL_EJES.find((e) => e.id === id))
          .filter(Boolean) as typeof ALL_EJES[number][];
        return (
          <div key={j} className={j > 0 ? (compact ? "pt-1 border-t border-gray-200" : "pt-2 border-t border-gray-200") : ""}>
            <span className="whitespace-pre-wrap leading-snug">{dcdItem.text}</span>
            {ejeInfos.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {ejeInfos.map((eje) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={eje.id}
                    src={`/icons/ejes-transversales/${eje.file}`}
                    alt={eje.label}
                    title={eje.label}
                    width={14}
                    height={14}
                    className="w-[14px] h-[14px] object-contain shrink-0"
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Metodologías / recursos con sus badges de principio DUA. */
function SubItemList({ items, printBadges = false }: { items: PumRowData["methodologyItems"]; printBadges?: boolean }) {
  const filled = items.filter((m) => m.text);
  if (!filled.length) return <Dash light />;
  return (
    <ul className="list-none m-0 p-0 divide-y divide-gray-200">
      {filled.map((item, j) => (
        <li key={j} className="flex flex-col gap-0.5 py-1.5 first:pt-0">
          <PrincipioBadges principles={item.principles ?? []} printClass={printBadges} />
          <span className="leading-snug whitespace-pre-wrap">• {item.text}</span>
        </li>
      ))}
    </ul>
  );
}
