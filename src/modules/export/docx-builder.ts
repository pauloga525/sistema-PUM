/**
 * DocxBuilder — rellena el template pum-template.docx con los datos de la
 * planificación usando patchDocument de la librería docx (sin dependencias externas).
 */

import {
  patchDocument,
  PatchType,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  ImageRun,
  AlignmentType,
  WidthType,
  VerticalAlign,
  BorderStyle,
  ShadingType,
  convertMillimetersToTwip,
} from "docx";
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import type {
  Planification,
  PumRowData,
  MethodologySubItem,
  PlanMetadata,
} from "@/modules/planification/planification.types";
import type { SignatureBlockData } from "@/modules/audit/audit.service";
import { ALL_EJES, PRINCIPIO_COLORS_HEX, DUA_PRINCIPIOS } from "@/constants/planification";
import { formatPrincipioLabel } from "@/modules/planification/planification.types";

// ── Cache de íconos PNG ───────────────────────────────────────────────────────
const _iconCache = new Map<string, Buffer>();
function readIcon(filename: string): Buffer {
  if (!_iconCache.has(filename)) {
    const p = path.join(process.cwd(), "public", "icons", "ejes-transversales", filename);
    _iconCache.set(filename, fs.readFileSync(p));
  }
  return _iconCache.get(filename)!;
}

// ── Paleta institucional ──────────────────────────────────────────────────────
const COLOR_PRIMARY = "1E40AF";
const COLOR_WHITE   = "FFFFFF";
const COLOR_BG_ALT  = "F1F5F9";
const COLOR_BORDER  = "CBD5E1";
const COLOR_TEXT    = "0F172A";
const COLOR_MUTED   = "475569";

// Fuente del documento
const FONT = "Century Gothic";

// ── Contexto académico ────────────────────────────────────────────────────────
export interface PlanContext {
  institutionName: string;
  teacherName: string;
  subjectName: string;
  levelName: string;
  levelTrack: string;      // "BASICA" | "BACHILLERATO"
  levelOrderIndex: number; // posición del nivel (1-10 básica, 1-3 bachiller)
  yearLabel: string;
  periodName: string;
  metadata: PlanMetadata | null;
}

/** True para 8vo-10mo básica y cualquier curso de bachillerato. */
function isUpperLevel(ctx: PlanContext): boolean {
  return ctx.levelTrack === "BACHILLERATO" || (ctx.levelTrack === "BASICA" && ctx.levelOrderIndex >= 8);
}

// ── Helpers de parches ────────────────────────────────────────────────────────

function trackToSubnivel(track: string): string {
  if (track === "BACHILLERATO") return "Bachillerato";
  if (track === "BASICA") return "Educación Básica";
  return track;
}

function textPatch(text: string) {
  return {
    type: PatchType.PARAGRAPH,
    children: [new TextRun({ text: text || "", font: FONT, size: 24 })],
  };
}

function listPatch(items: string[]) {
  const nonEmpty = items.filter(Boolean);
  if (nonEmpty.length === 0) {
    return {
      type: PatchType.PARAGRAPH,
      children: [new TextRun({ text: "—", font: FONT, size: 24 })],
    };
  }
  return {
    type: PatchType.DOCUMENT,
    children: nonEmpty.map(
      (text) =>
        new Paragraph({
          children: [new TextRun({ text: `• ${text}`, font: FONT, size: 24 })],
        })
    ),
  };
}

function duaSelectionToLines(
  sel: import("@/modules/planification/planification.types").DuaSelection | null | undefined,
  pIdx: number
): string[] {
  if (!sel || sel.length === 0) return [];
  return sel
    .filter((e) => e.subPautas.length > 0)
    .sort((a, b) => a.pauta - b.pauta)
    .flatMap((entry) => {
      const pd = DUA_PRINCIPIOS[pIdx].pautas.find((p) => p.num === entry.pauta);
      return [
        pd?.label ?? `Pauta ${entry.pauta}`,
        ...entry.subPautas.map((sn) => {
          const sp = pd?.subPautas.find((s) => s.num === sn);
          return `  P${pIdx + 1}:${entry.pauta}.${sn} ${sp?.label ?? ""}`.trim();
        }),
      ];
    });
}

// ── Helpers de tabla PUM ──────────────────────────────────────────────────────

const twip = (mm: number) => convertMillimetersToTwip(mm);

function border(color = COLOR_BORDER) {
  return { style: BorderStyle.SINGLE, size: 4, color };
}
function cellBorders(color = COLOR_BORDER) {
  return { top: border(color), bottom: border(color), left: border(color), right: border(color) };
}
function cellMargins() {
  return { top: twip(1.5), bottom: twip(1.5), left: twip(2), right: twip(2) };
}

function headerCell(text: string, widthPct: number, subtitle?: string): TableCell {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: COLOR_WHITE, size: 24, font: FONT })],
    }),
  ];
  if (subtitle) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: subtitle, italics: true, color: COLOR_WHITE, size: 18, font: FONT })],
      })
    );
  }
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.SOLID, fill: COLOR_PRIMARY, color: COLOR_PRIMARY },
    borders: cellBorders(COLOR_PRIMARY),
    verticalAlign: VerticalAlign.CENTER,
    margins: cellMargins(),
    children: paragraphs,
  });
}

function shading(isShaded: boolean) {
  return isShaded
    ? { type: ShadingType.SOLID, fill: COLOR_BG_ALT, color: COLOR_BG_ALT }
    : { type: ShadingType.CLEAR, fill: COLOR_WHITE, color: COLOR_WHITE };
}

function simpleCell(text: string, widthPct: number, isShaded: boolean): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: shading(isShaded),
    borders: cellBorders(),
    verticalAlign: VerticalAlign.CENTER,
    margins: cellMargins(),
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: text || "—", size: 24, font: FONT, color: text ? COLOR_TEXT : COLOR_MUTED })],
      }),
    ],
  });
}

function dcdCell(data: PumRowData, widthPct: number, isShaded: boolean): TableCell {
  const nonEmpty = data.dcdItems.filter((d) => d.text);

  const children: Paragraph[] = nonEmpty.length === 0
    ? [new Paragraph({ children: [new TextRun({ text: "—", size: 24, font: FONT, color: COLOR_MUTED })] })]
    : nonEmpty.flatMap((dcdItem, idx) => {
        const ejes = dcdItem.ejes
          .map((id) => ALL_EJES.find((e) => e.id === id))
          .filter(Boolean) as typeof ALL_EJES[number][];
        const paragraphs: Paragraph[] = [
          new Paragraph({
            children: [
              new TextRun({ text: dcdItem.text, size: 24, font: FONT, color: COLOR_TEXT }),
            ],
            spacing: { before: idx > 0 ? 120 : 0, after: ejes.length > 0 ? 80 : 0 },
          }),
        ];
        if (ejes.length > 0) {
          paragraphs.push(
            new Paragraph({
              children: ejes.flatMap((eje) => [
                new ImageRun({
                  data: readIcon(eje.file),
                  transformation: { width: 16, height: 16 },
                  type: "png",
                }),
                new TextRun({ text: "  ", size: 20, font: FONT }),
              ]),
              spacing: { after: 0 },
            })
          );
        }
        return paragraphs;
      });

  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: shading(isShaded),
    borders: cellBorders(),
    verticalAlign: VerticalAlign.TOP,
    margins: cellMargins(),
    children,
  });
}

function listCell(items: string[], widthPct: number, isShaded: boolean): TableCell {
  const nonEmpty = items.filter(Boolean);
  const children: Paragraph[] =
    nonEmpty.length > 0
      ? nonEmpty.map((text, idx) =>
          new Paragraph({
            children: [
              new TextRun({ text: "• ", size: 24, font: FONT, color: COLOR_MUTED }),
              new TextRun({ text, size: 24, font: FONT, color: COLOR_TEXT }),
            ],
            spacing: { after: idx < nonEmpty.length - 1 ? 60 : 0 },
          })
        )
      : [new Paragraph({ children: [new TextRun({ text: "—", size: 24, font: FONT, color: COLOR_MUTED })] })];

  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: shading(isShaded),
    borders: cellBorders(),
    verticalAlign: VerticalAlign.TOP,
    margins: cellMargins(),
    children,
  });
}

const COLOR_EMPTY_CELL = "D9D9D9";

function methodologyCell(items: MethodologySubItem[], widthPct: number, isShaded: boolean): TableCell {
  const nonEmpty = items.filter((i) => i.text);
  const isEmpty = nonEmpty.length === 0;
  const children: Paragraph[] = isEmpty
    ? [new Paragraph({ children: [new TextRun({ text: "—", size: 24, font: FONT, color: COLOR_MUTED })] })]
    : nonEmpty.map((item, idx) => {
        const principleRuns: TextRun[] = (item.principles ?? []).flatMap((p) => [
          new TextRun({
            text: ` ${formatPrincipioLabel(p as Parameters<typeof formatPrincipioLabel>[0])} `,
            size: 20,
            bold: true,
            font: FONT,
            color: COLOR_WHITE,
            shading: {
              type: ShadingType.SOLID,
              fill: PRINCIPIO_COLORS_HEX[p.principio],
              color: PRINCIPIO_COLORS_HEX[p.principio],
            },
          }),
          new TextRun({ text: "  ", size: 20, font: FONT }),
        ]);
        return new Paragraph({
          children: [
            ...principleRuns,
            new TextRun({ text: item.text, size: 24, font: FONT, color: COLOR_TEXT }),
          ],
          spacing: { after: idx < nonEmpty.length - 1 ? 80 : 0 },
        });
      });

  const cellShading = isEmpty
    ? { type: ShadingType.SOLID, fill: COLOR_EMPTY_CELL, color: COLOR_EMPTY_CELL }
    : shading(isShaded);

  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: cellShading,
    borders: cellBorders(),
    verticalAlign: VerticalAlign.TOP,
    margins: cellMargins(),
    children,
  });
}

function fmtDateDocx(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-EC", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function signatureCell(paragraphs: Paragraph[], widthPct: number, isRight = false): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: isRight
      ? cellBorders()
      : {
          top: border(), bottom: border(), left: border(),
          right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_PRIMARY },
        },
    margins: cellMargins(),
    verticalAlign: VerticalAlign.TOP,
    children: paragraphs,
  });
}

function signatureText(text: string, bold = false, color = COLOR_TEXT): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: text || "—", size: 22, font: FONT, bold, color })],
    spacing: { after: 40 },
  });
}

function buildSignatureTable(data: SignatureBlockData): Table {
  const teacherNamesStr = data.teacherNames.length > 0 ? data.teacherNames.join(", ") : "—";

  const headerRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        width: { size: 100, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, fill: COLOR_PRIMARY, color: COLOR_PRIMARY },
        borders: cellBorders(COLOR_PRIMARY),
        margins: cellMargins(),
        children: [
          new Paragraph({
            children: [new TextRun({ text: "Enviado para revisión por los docentes:", bold: true, color: COLOR_WHITE, size: 22, font: FONT })],
          }),
        ],
      }),
    ],
  });

  const teacherRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 2,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: cellBorders(),
        margins: cellMargins(),
        children: [
          new Paragraph({ children: [new TextRun({ text: teacherNamesStr, size: 22, font: FONT, bold: true, color: COLOR_TEXT })], spacing: { after: 40 } }),
          new Paragraph({ children: [new TextRun({ text: `Fecha y hora de envío: ${fmtDateDocx(data.finalizedAt)}`, size: 20, font: FONT, color: COLOR_MUTED })], spacing: { after: 0 } }),
        ],
      }),
    ],
  });

  const sigRow = new TableRow({
    children: [
      signatureCell([
        signatureText("Enviado para firma por el coordinador:", true, COLOR_PRIMARY),
        signatureText(data.coordinatorName ?? "—", true),
        signatureText(`Cédula: ${data.coordinatorCedula ?? "—"}`, false, COLOR_MUTED),
        new Paragraph({ children: [new TextRun({ text: `Fecha y hora de envío: ${fmtDateDocx(data.sentForSignatureAt)}`, size: 20, font: FONT, color: COLOR_MUTED })], spacing: { after: 0 } }),
      ], 50, false),
      signatureCell([
        signatureText("Revisado y firmado por el administrador:", true, COLOR_PRIMARY),
        signatureText(data.adminName ?? "—", true),
        signatureText(`Cédula: ${data.adminCedula ?? "—"}`, false, COLOR_MUTED),
        new Paragraph({ children: [new TextRun({ text: `Fecha y hora de firma: ${fmtDateDocx(data.signedAt)}`, size: 20, font: FONT, color: COLOR_MUTED })], spacing: { after: 0 } }),
      ], 50, true),
    ],
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, teacherRow, sigRow],
  });
}

function buildPumTable(plan: Planification): Table {
  const COLS = [
    { label: "#",                     subtitle: undefined,                                                                pct:  4 },
    { label: "¿Qué van a aprender?",  subtitle: "Destreza con Criterio de Desempeño / Competencia",                     pct: 16 },
    { label: "¿Qué evaluar?",         subtitle: "Indicadores de evaluación",                                             pct: 18 },
    { label: "¿Cómo van a aprender?", subtitle: "Metodologías para los aprendizajes · Estrategias Metodológicas · DUA", pct: 25 },
    { label: "Recursos",              subtitle: undefined,                                                                pct: 17 },
    { label: "¿Cómo evaluar?",        subtitle: "Actividades de Evaluación / Técnicas / Instrumentos",                   pct: 20 },
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    children: COLS.map((c) => headerCell(c.label, c.pct, c.subtitle)),
  });

  const dataRows = plan.rows.map((row, i) => {
    const odd = i % 2 === 1;
    return new TableRow({
      children: [
        simpleCell(String(i + 1),                  COLS[0].pct, odd),
        dcdCell(row.data,                           COLS[1].pct, odd),
        listCell(row.data.indicators,               COLS[2].pct, odd),
        methodologyCell(row.data.methodologyItems,  COLS[3].pct, odd),
        methodologyCell(row.data.resources,          COLS[4].pct, odd),
        listCell(row.data.evaluations,              COLS[5].pct, odd),
      ],
    });
  });

  if (dataRows.length === 0) {
    dataRows.push(
      new TableRow({ children: COLS.map((c) => simpleCell("", c.pct, false)) })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

// ── Ajuste de márgenes y orientación en el ZIP del docx ──────────────────────
// Fuerza orientación horizontal (A4 landscape) para que la tabla de 6 columnas
// quepa sin que los encabezados se corten. El header/footer del template se preserva.
async function setSideMargins(docxBuffer: Buffer, mm: number): Promise<Buffer> {
  const twips = String(Math.round((mm / 25.4) * 1440));
  // A4 landscape: 297mm × 210mm en twips
  const A4_W = "16838";
  const A4_H = "11906";

  const zip = await JSZip.loadAsync(docxBuffer);
  const xmlFile = zip.file("word/document.xml");
  if (!xmlFile) return docxBuffer;

  const xml = await xmlFile.async("string");
  const updated = xml
    .replace(/w:left="[^"]*"/g,  `w:left="${twips}"`)
    .replace(/w:right="[^"]*"/g, `w:right="${twips}"`)
    // Force landscape by replacing the pgSz element entirely
    .replace(/<w:pgSz[^/]*\/>/g, `<w:pgSz w:w="${A4_W}" w:h="${A4_H}" w:orient="landscape"/>`);

  zip.file("word/document.xml", updated);
  return zip.generateAsync({ type: "nodebuffer" }) as Promise<Buffer>;
}

// ── DocxBuilder ───────────────────────────────────────────────────────────────

export class DocxBuilder {
  async build(plan: Planification, ctx: PlanContext, signatureBlock?: SignatureBlockData | null): Promise<Buffer> {
    const templateFile = isUpperLevel(ctx) ? "pum-template-superior.docx" : "pum-template.docx";
    const templatePath = path.join(process.cwd(), "src", "templates", templateFile);
    const templateBuffer = fs.readFileSync(templatePath);

    const meta: PlanMetadata = ctx.metadata ?? {
      areaEstudio: "",
      numUnidad: "",
      titulo: "",
      objetivos: [],
      criterios: [],
      nPeriodos: "",
      fechInicio: "",
      fechFin: "",
      ejesTransversales: "",
      aportes: [],
      p1: null,
      p2: null,
      p3: null,
    };

    // Aportes: siempre 6 filas en el template
    const aportes = [
      ...meta.aportes,
      ...Array.from({ length: Math.max(0, 6 - meta.aportes.length) }, () => ({
        dim: "", aporte: "", como: "",
      })),
    ].slice(0, 6);

    const pumTable = buildPumTable(plan);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patches: Record<string, any> = {
      // ── Datos Informativos ──────────────────────────────────────────────
      "nivel-educat-sub": textPatch(trackToSubnivel(ctx.levelTrack)),
      "nivel":            textPatch(ctx.levelName),
      "curso":            textPatch(""),
      "area-estudio":     textPatch(meta.areaEstudio),
      "asignatura":       textPatch(ctx.subjectName),
      "docentes":         textPatch(ctx.teacherName),
      "num-unidad":       textPatch(meta.numUnidad),
      "titulo-unidad":    textPatch(meta.titulo),
      "objetivos":        listPatch(meta.objetivos),
      "criterios":        listPatch(meta.criterios),

      // ── Planificación ───────────────────────────────────────────────────
      "n-per":       textPatch(meta.nPeriodos),
      "fech-inicio": textPatch(meta.fechInicio),
      "fech-fin":    textPatch(meta.fechFin),
      "eje-trans-1": textPatch(meta.ejesTransversales),

      // Aportes Multimodales (6 filas fijas en el template)
      "dim1": textPatch(aportes[0].dim),    "aporte1": textPatch(aportes[0].aporte),    "como1": textPatch(aportes[0].como),
      "dim2": textPatch(aportes[1].dim),    "aporte2": textPatch(aportes[1].aporte),    "como2": textPatch(aportes[1].como),
      "dim3": textPatch(aportes[2].dim),    "aporte3": textPatch(aportes[2].aporte),    "como3": textPatch(aportes[2].como),
      "dim4": textPatch(aportes[3].dim),    "aporte4": textPatch(aportes[3].aporte),    "como4": textPatch(aportes[3].como),
      "dim5": textPatch(aportes[4].dim),    "aporte5": textPatch(aportes[4].aporte),    "como5": textPatch(aportes[4].como),
      "dim6": textPatch(aportes[5].dim),    "aporte6": textPatch(aportes[5].aporte),    "como6": textPatch(aportes[5].como),

      // DUA — Pautas por principio
      "p1-pautas": listPatch(duaSelectionToLines(meta.p1, 0)),
      "p2-pautas": listPatch(duaSelectionToLines(meta.p2, 1)),
      "p3-pautas": listPatch(duaSelectionToLines(meta.p3, 2)),

      // ── Tabla PUM principal + membrete de firmas ────────────────────────
      "tabla": {
        type: PatchType.DOCUMENT,
        children: [
          pumTable,
          ...(signatureBlock ? [
            new Paragraph({ children: [], spacing: { after: 200 } }),
            buildSignatureTable(signatureBlock),
          ] : []),
        ],
      },
    };

    const patched = await patchDocument({
      outputType: "nodebuffer",
      data: templateBuffer,
      patches,
      keepOriginalStyles: true,
    });

    // Solo ajusta márgenes laterales a 1 cm; top/bottom/header del template se preservan
    return setSideMargins(patched as Buffer, 10);
  }
}

export const docxBuilder = new DocxBuilder();
