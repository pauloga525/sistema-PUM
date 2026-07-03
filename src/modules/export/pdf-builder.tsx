/**
 * PdfBuilder — genera el PDF usando membrete.pdf como fondo y @react-pdf/renderer
 * para las tablas de contenido. pdf-lib fusiona ambas capas.
 */

import React from "react";
import fs from "fs";
import path from "path";
import {
  Document,
  Font,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { PDFDocument } from "pdf-lib";
import type { Planification, PlanMetadata, MethodologySubItem } from "@/modules/planification/planification.types";
import type { SignatureBlockData } from "@/modules/audit/audit.service";
import { EJES_TRANSVERSALES } from "@/constants/planification";
import type { PlanContext } from "./docx-builder";

// ── Registro de fuentes ───────────────────────────────────────────────────────
function findFont(filename: string): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "fonts", filename),
    path.join("C:", "Windows", "Fonts", filename),
  ];
  return candidates.find((p) => { try { return fs.existsSync(p); } catch { return false; } }) ?? null;
}

const GOTHIC_REGULAR = findFont("GOTHIC.TTF");
const GOTHIC_BOLD    = findFont("GOTHICB.TTF");

if (GOTHIC_REGULAR) {
  Font.register({
    family: "Century Gothic",
    fonts: [
      { src: GOTHIC_REGULAR },
      ...(GOTHIC_BOLD ? [{ src: GOTHIC_BOLD, fontWeight: "bold" as const }] : []),
    ],
  });
}

const FONT      = GOTHIC_REGULAR ? "Century Gothic" : "Helvetica";
const FONT_BOLD = GOTHIC_REGULAR ? "Century Gothic" : "Helvetica-Bold";

// ── Dimensiones del membrete (Letter landscape) ───────────────────────────────
const PAGE_W = 792;  // pt
const PAGE_H = 612;  // pt
// Espacio superior reservado para el membrete (encabezado con logos)
const HEADER_PAD = 110; // pt ≈ 39 mm

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  blue:      "#1E40AF",
  blueLight: "#BFDBFE",
  white:     "#FFFFFF",
  text:      "#0F172A",
  muted:     "#475569",
  border:    "#94A3B8",
  bgAlt:     "#F1F5F9",
  badgeP1:   "#059669",
  badgeP2:   "#7C3AED",
  badgeP3:   "#0EA5E9",
  blueLabel: "#1e3a8a",
} as const;

// Colores de tema Word usados en el documento institucional
const VERDE     = "#70AD47"; // Verde Énfasis 6
const VERDE_LT  = "#E2EFDA"; // Verde Énfasis 6, claro 80%
const ROSA      = "#ED7D96"; // Rosa Énfasis 5
const ROSA_LT   = "#FBE5EA"; // Rosa Énfasis 5, claro 80%
const TEAL_LT40 = "#93CDDD"; // Turquesa Énfasis 4, claro 40%

const BADGE_COLORS: Record<1 | 2 | 3, string> = {
  1: C.badgeP1, 2: C.badgeP2, 3: C.badgeP3,
};
// Franjas de Colorimetría en la sección DUA
const DUA_COLORS: Record<1 | 2 | 3, string> = {
  1: "#4EA72E", // Verde
  2: "#A02B93", // Morado/Magenta
  3: "#60CAF3", // Turquesa/Azul claro
};

// ── Estilos ───────────────────────────────────────────────────────────────────
// Sin backgroundColor en la Page: las áreas sin contenido quedan transparentes
// y dejan ver el membrete de fondo al fusionar con pdf-lib.
const S = StyleSheet.create({
  page: {
    flexDirection: "column",
    paddingTop: HEADER_PAD,
    paddingHorizontal: 28,
    paddingBottom: 20,
    fontFamily: FONT,
    fontSize: 12,
  },
  // ── Tabla genérica ────────────────────────────────────────────────────────
  table:  { width: "100%", marginBottom: 3 },
  row:    { flexDirection: "row" },
  cell: {
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 4, paddingVertical: 3,
    backgroundColor: C.white,
  },
  // Celda de etiqueta — fondo azul + texto blanco, igual que el Word
  lblCell: {
    borderWidth: 0.5, borderColor: C.border,
    backgroundColor: C.blue,
    paddingHorizontal: 4, paddingVertical: 3,
    justifyContent: "center",
  },
  hdrCell: {
    borderWidth: 0.5, borderColor: C.blue,
    backgroundColor: C.blue,
    paddingHorizontal: 4, paddingVertical: 4,
    alignItems: "center", justifyContent: "center",
  },
  hdrText: { fontSize: 12, fontFamily: FONT_BOLD, fontWeight: "bold", color: C.white, textAlign: "center" },
  // "1. DATOS INFORMATIVOS" / "2. PLANIFICACIÓN" — Verde Énfasis 6, claro 80%
  secRow: {
    borderWidth: 0.5, borderColor: VERDE_LT,
    backgroundColor: VERDE_LT,
    paddingHorizontal: 5, paddingVertical: 3,
  },
  secText: { fontSize: 12, fontFamily: FONT_BOLD, fontWeight: "bold", color: "#375623" },
  // "APORTES MULTIMODALES" / "DISEÑO UNIVERSAL" — Rosa Énfasis 5, claro 80%
  rosaHdrCell: {
    borderWidth: 0.5, borderColor: ROSA_LT,
    backgroundColor: ROSA_LT,
    paddingHorizontal: 4, paddingVertical: 4,
    alignItems: "center", justifyContent: "center",
  },
  rosaHdrText: { fontSize: 12, fontFamily: FONT_BOLD, fontWeight: "bold", color: "#7B2240", textAlign: "center" },
  lbl:  { fontSize: 12, fontFamily: FONT_BOLD, fontWeight: "bold", color: C.white },
  val:  { fontSize: 12, fontFamily: FONT, color: C.text },
  muted:{ fontSize: 10, fontFamily: FONT, color: C.muted },
  // ── PUM main table ────────────────────────────────────────────────────────
  pumHdr: {
    borderWidth: 0.5, borderColor: C.blue,
    backgroundColor: C.blue,
    paddingHorizontal: 4, paddingVertical: 3,
    justifyContent: "center",
    minWidth: 0,
  },
  pumHdrTxt: { fontSize: 12, fontFamily: FONT_BOLD, fontWeight: "bold", color: C.white },
  pumCell: {
    borderWidth: 0.5, borderColor: C.border,
    paddingHorizontal: 4, paddingVertical: 3,
    backgroundColor: C.white,
    minWidth: 0,
  },
  bullet: { marginBottom: 1 },
  badgeView: {
    borderRadius: 2,
    paddingHorizontal: 3, paddingVertical: 1,
    marginRight: 3,
    alignSelf: "flex-start",
    marginTop: 1,
  },
  badgeTxt: { fontSize: 10, fontFamily: FONT_BOLD, fontWeight: "bold", color: C.white },
  methodRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3 },
  ejeRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  ejeImg: { width: 14, height: 14, marginRight: 3 },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Lee el ícono como base64 para evitar problemas de ruta en Windows con react-pdf
const _ejeIconCache = new Map<string, string | null>();
function ejeIconBase64(file: string): string | null {
  if (!_ejeIconCache.has(file)) {
    try {
      const p = path.join(process.cwd(), "public", "icons", "ejes-transversales", file);
      const data = fs.readFileSync(p);
      _ejeIconCache.set(file, `data:image/png;base64,${data.toString("base64")}`);
    } catch {
      _ejeIconCache.set(file, null);
    }
  }
  return _ejeIconCache.get(file) ?? null;
}

function trackToSubnivel(track: string): string {
  if (track === "BACHILLERATO") return "Bachillerato";
  if (track === "BASICA") return "Educación Básica";
  return track;
}

function BulletList({ items }: { items: string[] }) {
  const nonEmpty = items.filter(Boolean);
  if (nonEmpty.length === 0) return <Text style={S.muted}>—</Text>;
  return (
    <View>
      {nonEmpty.map((item, i) => (
        <Text key={i} style={[S.val, S.bullet]}>• {item}</Text>
      ))}
    </View>
  );
}

// ── Secciones del documento ───────────────────────────────────────────────────

function SectionRow({ title }: { title: string }) {
  return (
    <View style={S.row}>
      <View style={[S.secRow, { flex: 1 }]}>
        <Text style={S.secText}>{title}</Text>
      </View>
    </View>
  );
}

function BlueHeaderRow({ title }: { title: string }) {
  return (
    <View style={S.row}>
      <View style={[S.hdrCell, { flex: 1 }]}>
        <Text style={S.hdrText}>{title}</Text>
      </View>
    </View>
  );
}

function RosaHeaderRow({ title }: { title: string }) {
  return (
    <View style={S.row}>
      <View style={[S.rosaHdrCell, { flex: 1 }]}>
        <Text style={S.rosaHdrText}>{title}</Text>
      </View>
    </View>
  );
}

// ── Tabla de Datos Informativos + Planificación + Aportes + DUA ───────────────

function InfoTable({ ctx, meta }: { ctx: PlanContext; meta: PlanMetadata }) {
  const nivelSub = trackToSubnivel(ctx.levelTrack);
  const aportes = [
    ...meta.aportes,
    ...Array.from({ length: Math.max(0, 6 - meta.aportes.length) }, () => ({ dim: "", aporte: "", como: "" })),
  ].slice(0, 6);

  // ── Fixed column grid — boundaries at 20 % / 30 % / 50 % / 58 % ──────────
  // Each row's last cell uses flex:1 so rounding never causes overflow.
  const L  = { width: "20%", flexShrink: 0 } as const;  // main label (ALL rows)
  const S2 = { width: "10%", flexShrink: 0 } as const;  // narrow  (Subnivel val, Nº Unidad val, Nº Periodos val)
  const S3 = { width: "20%", flexShrink: 0 } as const;  // medium  (Subnivel label, Título label part)
  const S4 = { width: "8%",  flexShrink: 0 } as const;  // short   (Grados, Asignatura)
  // Combined spans used inline:
  //   S2+S3        = 30 %  →  Área de Estudio value
  //   S3+S4        = 28 %  →  Título de la Unidad label
  const LAST = { flex: 1 } as const;                     // fills exact remainder

  return (
    <View style={S.table}>
      <BlueHeaderRow title="PLAN DE UNIDAD MICROCURRICULAR" />
      <SectionRow title="1.  DATOS INFORMATIVOS" />

      {/* NIVEL EDUCATIVO | Subnivel | val | Grados | val  → borders: 20%·30%·50%·58% */}
      <View style={S.row}>
        <View style={[S.lblCell, L]}><Text style={S.lbl}>NIVEL EDUCATIVO</Text></View>
        <View style={[S.lblCell, S2]}><Text style={S.lbl}>Subnivel</Text></View>
        <View style={[S.cell,    S3]}><Text style={S.val}>{nivelSub}</Text></View>
        <View style={[S.lblCell, S4]}><Text style={S.lbl}>Grados</Text></View>
        <View style={[S.cell,    LAST]}><Text style={S.val}>{ctx.levelName}</Text></View>
      </View>

      {/* Área de Estudio | val(30%) | Asignatura | val  → borders: 20%·50%·58% */}
      <View style={S.row}>
        <View style={[S.lblCell, L]}><Text style={S.lbl}>Área de Estudio</Text></View>
        <View style={[S.cell,    { width: "30%", flexShrink: 0 }]}><Text style={S.val}>{meta.areaEstudio || "—"}</Text></View>
        <View style={[S.lblCell, S4]}><Text style={S.lbl}>Asignatura</Text></View>
        <View style={[S.cell,    LAST]}><Text style={S.val}>{ctx.subjectName}</Text></View>
      </View>

      {/* Docentes | val  → border: 20% */}
      <View style={S.row}>
        <View style={[S.lblCell, L]}><Text style={S.lbl}>Docentes</Text></View>
        <View style={[S.cell,    LAST]}><Text style={S.val}>{ctx.teacherName}</Text></View>
      </View>

      {/* Nº Unidad | val(10%) | Título(28%) | val  → borders: 20%·30%·58% */}
      <View style={S.row}>
        <View style={[S.lblCell, L]}><Text style={S.lbl}>Número de la Unidad</Text></View>
        <View style={[S.cell,    { ...S2, alignItems: "center" }]}>
          <Text style={[S.val, { fontFamily: FONT_BOLD, fontWeight: "bold" }]}>{meta.numUnidad || "—"}</Text>
        </View>
        <View style={[S.lblCell, { width: "28%", flexShrink: 0 }]}><Text style={S.lbl}>Título de la Unidad</Text></View>
        <View style={[S.cell,    LAST]}><Text style={S.val}>{meta.titulo || "—"}</Text></View>
      </View>

      {/* Objetivos | val  → border: 20% */}
      <View style={S.row}>
        <View style={[S.lblCell, L]}><Text style={S.lbl}>Objetivos de la Unidad</Text></View>
        <View style={[S.cell,    LAST]}><BulletList items={meta.objetivos} /></View>
      </View>

      {/* Criterios | val  → border: 20% */}
      <View style={S.row}>
        <View style={[S.lblCell, L]}><Text style={S.lbl}>Criterios de Evaluación</Text></View>
        <View style={[S.cell,    LAST]}><BulletList items={meta.criterios} /></View>
      </View>

      <SectionRow title="2.  PLANIFICACIÓN" />

      {/* Nº Periodos | val | Fecha inicio | val | Fecha fin | val  → border: 20%·30% */}
      <View style={S.row}>
        <View style={[S.lblCell, L]}><Text style={S.lbl}>N° de Periodos</Text></View>
        <View style={[S.cell,    S2]}><Text style={S.val}>{meta.nPeriodos || "—"}</Text></View>
        <View style={[S.lblCell, { width: "15%", flexShrink: 0 }]}><Text style={S.lbl}>Fecha de inicio</Text></View>
        <View style={[S.cell,    { width: "17%", flexShrink: 0 }]}><Text style={S.val}>{meta.fechInicio || "—"}</Text></View>
        <View style={[S.lblCell, { width: "20%", flexShrink: 0 }]}><Text style={S.lbl}>Fecha de finalización</Text></View>
        <View style={[S.cell,    LAST]}><Text style={S.val}>{meta.fechFin || "—"}</Text></View>
      </View>

      {/* Ejes Transversales | val  → border: 20% */}
      <View style={S.row}>
        <View style={[S.lblCell, L]}><Text style={S.lbl}>Ejes Transversales</Text></View>
        <View style={[S.cell,    LAST]}><Text style={S.val}>{meta.ejesTransversales || "—"}</Text></View>
      </View>

      <RosaHeaderRow title="APORTES MULTIMODALES A DESARROLLAR EN LA UNIDAD" />
      <View style={S.row}>
        <View style={[S.hdrCell, { flex: 3 }]}><Text style={S.hdrText}>Dimensión y Opción Transversal</Text></View>
        <View style={[S.hdrCell, { flex: 4 }]}><Text style={S.hdrText}>Aporte Multimodal del Nivel / Subnivel</Text></View>
        <View style={[S.hdrCell, { flex: 3 }]}><Text style={S.hdrText}>¿Cómo van a aprender?</Text></View>
      </View>
      {aportes.map((ap, i) => (
        <View key={i} style={[S.row, i % 2 === 1 ? { backgroundColor: C.bgAlt } : {}]}>
          <View style={[S.cell, { flex: 3 }]}><Text style={S.val}>{ap.dim || ""}</Text></View>
          <View style={[S.cell, { flex: 4 }]}><Text style={S.val}>{ap.aporte || ""}</Text></View>
          <View style={[S.cell, { flex: 3 }]}><Text style={S.val}>{ap.como || ""}</Text></View>
        </View>
      ))}

      <RosaHeaderRow title="DISEÑO UNIVERSAL DEL APRENDIZAJE" />
      <View style={S.row}>
        <View style={[S.hdrCell, { flex: 2 }]}><Text style={S.hdrText}>Colorimetría</Text></View>
        <View style={[S.hdrCell, { flex: 5 }]}><Text style={S.hdrText}>Principio</Text></View>
        <View style={[S.hdrCell, { flex: 3 }]}><Text style={S.hdrText}>Pautas</Text></View>
      </View>
      {([1, 2, 3] as const).map((p) => {
        const labels: Record<1 | 2 | 3, { prefix: string; desc: string }> = {
          1: { prefix: "P I:",   desc: "PROVEER MÚLTIPLES FORMAS DE REPRESENTACIÓN" },
          2: { prefix: "P II:",  desc: "OFRECER MÚLTIPLES MEDIOS PARA LA ACCIÓN Y EXPRESIÓN" },
          3: { prefix: "P III:", desc: "PROPORCIONAR MÚLTIPLES MEDIOS PARA LA MOTIVACIÓN E IMPLICACIÓN EN EL APRENDIZAJE" },
        };
        const pautas = p === 1 ? meta.p1Pautas : p === 2 ? meta.p2Pautas : meta.p3Pautas;
        return (
          <View key={p} style={S.row}>
            <View style={[S.cell, { flex: 2, backgroundColor: DUA_COLORS[p] }]} />
            <View style={[S.cell, { flex: 5 }]}>
              <Text style={S.val}>
                <Text style={{ fontFamily: FONT_BOLD, fontWeight: "bold" }}>{labels[p].prefix} </Text>
                {labels[p].desc}
              </Text>
            </View>
            <View style={[S.cell, { flex: 3 }]}><BulletList items={pautas} /></View>
          </View>
        );
      })}
    </View>
  );
}

// ── Tabla PUM principal ───────────────────────────────────────────────────────

const PUM_COLS = [
  { label: "#",                    flex: 0.4 },
  { label: "¿Qué van a aprender?", flex: 2   },
  { label: "¿Qué evaluar?",        flex: 1.7 },
  { label: "¿Cómo van a aprender?",flex: 2.5 },
  { label: "Recursos",             flex: 1.3 },
  { label: "¿Cómo evaluar?",       flex: 2.1 },
] as const;

function MethodologyItems({ items }: { items: MethodologySubItem[] }) {
  const nonEmpty = items.filter((i) => i.text);
  if (nonEmpty.length === 0) return <Text style={S.muted}>—</Text>;
  return (
    <View>
      {nonEmpty.map((item, i) => (
        <View key={i} style={[S.methodRow, { marginBottom: i < nonEmpty.length - 1 ? 4 : 0 }]}>
          {item.principle && (
            <View style={[S.badgeView, { backgroundColor: BADGE_COLORS[item.principle.principio] }]}>
              <Text style={S.badgeTxt}>P{item.principle.principio}.{(item.principle.numeros ?? [(item.principle as unknown as {numero?: number}).numero ?? 1]).join(",")}</Text>
            </View>
          )}
          <Text style={[S.val, { flex: 1 }]}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

function PumTable({ plan }: { plan: Planification }) {
  return (
    <View style={[S.table, { marginTop: 6 }]}>
      <View style={S.row}>
        {PUM_COLS.map((col) => (
          <View key={col.label} style={[S.pumHdr, { flex: col.flex }]}>
            <Text style={S.pumHdrTxt}>{col.label}</Text>
          </View>
        ))}
      </View>

      {plan.rows.length === 0 ? (
        <View style={S.row}>
          <View style={[S.pumCell, { flex: 1, alignItems: "center" }]}>
            <Text style={S.muted}>Sin filas registradas</Text>
          </View>
        </View>
      ) : (
        plan.rows.map((row, i) => {
          const odd = i % 2 === 1;
          const bg = odd ? C.bgAlt : C.white;
          const methodologyEmpty = !row.data.methodologyItems.some((m) => m.text);
          const ejes = (row.data.ejeTransversales ?? [])
            .map((id: number) => EJES_TRANSVERSALES.find((e) => e.id === id))
            .filter(Boolean) as typeof EJES_TRANSVERSALES[number][];

          return (
            <View key={row.id} style={S.row} wrap={false}>
              <View style={[S.pumCell, { flex: PUM_COLS[0].flex, backgroundColor: bg, alignItems: "center", justifyContent: "center" }]}>
                <Text style={S.muted}>{i + 1}</Text>
              </View>
              <View style={[S.pumCell, { flex: PUM_COLS[1].flex, backgroundColor: bg }]}>
                <Text style={S.val}>{row.data.dcd || "—"}</Text>
                {ejes.length > 0 && (
                  <View style={[S.ejeRow, { flexWrap: "wrap" }]}>
                    {ejes.map((eje) => {
                      const ejeIcon = ejeIconBase64(eje.file);
                      return ejeIcon ? (
                        <Image key={eje.id} src={ejeIcon} style={[S.ejeImg, { marginRight: 4 }]} />
                      ) : null;
                    })}
                  </View>
                )}
              </View>
              <View style={[S.pumCell, { flex: PUM_COLS[2].flex, backgroundColor: bg }]}>
                <BulletList items={row.data.indicators} />
              </View>
              <View style={[S.pumCell, { flex: PUM_COLS[3].flex, backgroundColor: methodologyEmpty ? "#D9D9D9" : bg }]}>
                <MethodologyItems items={row.data.methodologyItems} />
              </View>
              <View style={[S.pumCell, { flex: PUM_COLS[4].flex, backgroundColor: bg }]}>
                <BulletList items={row.data.resources} />
              </View>
              <View style={[S.pumCell, { flex: PUM_COLS[5].flex, backgroundColor: bg }]}>
                <BulletList items={row.data.evaluations} />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

// ── Membrete de firmas ────────────────────────────────────────────────────────

function fmtDatePdf(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-EC", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function SignatureSection({ data }: { data: SignatureBlockData }) {
  const teacherStr = data.teacherNames.length > 0 ? data.teacherNames.join(", ") : "—";
  const SIG_BORDER = { borderWidth: 0.5, borderColor: "#002753" };

  return (
    <View style={{ marginTop: 12, borderWidth: 0.5, borderColor: "#002753" }}>
      {/* Fila docentes — cabecera */}
      <View style={{ backgroundColor: "#002753", paddingHorizontal: 6, paddingVertical: 4 }}>
        <Text style={{ fontFamily: FONT_BOLD, fontWeight: "bold", fontSize: 10, color: C.white }}>
          Enviado para revisión por los docentes:
        </Text>
      </View>
      {/* Fila docentes — datos */}
      <View style={{ paddingHorizontal: 6, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#002753" }}>
        <Text style={{ fontFamily: FONT_BOLD, fontWeight: "bold", fontSize: 10, color: C.text }}>{teacherStr}</Text>
        <Text style={{ fontFamily: FONT, fontSize: 9, color: C.muted, marginTop: 2 }}>
          Fecha y hora de envío: {fmtDatePdf(data.finalizedAt)}
        </Text>
      </View>
      {/* Fila coordinador + admin */}
      <View style={{ flexDirection: "row" }}>
        {/* Coordinador */}
        <View style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 5, borderRightWidth: 0.5, borderRightColor: "#002753" }}>
          <Text style={{ fontFamily: FONT_BOLD, fontWeight: "bold", fontSize: 9, color: "#002753", marginBottom: 3 }}>
            Enviado para firma por el coordinador:
          </Text>
          <Text style={{ fontFamily: FONT_BOLD, fontWeight: "bold", fontSize: 10, color: C.text }}>{data.coordinatorName ?? "—"}</Text>
          <Text style={{ fontFamily: FONT, fontSize: 9, color: C.muted, marginTop: 1 }}>Cédula: {data.coordinatorCedula ?? "—"}</Text>
          <Text style={{ fontFamily: FONT, fontSize: 9, color: C.muted, marginTop: 2 }}>
            Fecha y hora de envío: {fmtDatePdf(data.sentForSignatureAt)}
          </Text>
        </View>
        {/* Administrador */}
        <View style={{ flex: 1, paddingHorizontal: 6, paddingVertical: 5 }}>
          <Text style={{ fontFamily: FONT_BOLD, fontWeight: "bold", fontSize: 9, color: "#002753", marginBottom: 3 }}>
            Revisado y firmado por el administrador:
          </Text>
          <Text style={{ fontFamily: FONT_BOLD, fontWeight: "bold", fontSize: 10, color: C.text }}>{data.adminName ?? "—"}</Text>
          <Text style={{ fontFamily: FONT, fontSize: 9, color: C.muted, marginTop: 1 }}>Cédula: {data.adminCedula ?? "—"}</Text>
          <Text style={{ fontFamily: FONT, fontSize: 9, color: C.muted, marginTop: 2 }}>
            Fecha y hora de firma: {fmtDatePdf(data.signedAt)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Documento principal ───────────────────────────────────────────────────────

function PlanDocument({ plan, ctx, signatureBlock }: { plan: Planification; ctx: PlanContext; signatureBlock?: SignatureBlockData | null }) {
  const meta: PlanMetadata = ctx.metadata ?? {
    areaEstudio: "", numUnidad: "", titulo: "", objetivos: [], criterios: [],
    nPeriodos: "", fechInicio: "", fechFin: "", ejesTransversales: "",
    aportes: [], p1Pautas: [], p2Pautas: [], p3Pautas: [],
  };

  return (
    <Document
      creator={ctx.teacherName}
      title={`PUM ${ctx.subjectName} — ${ctx.levelName}`}
    >
      {/* Tamaño igual al membrete.pdf (Letter landscape 792×612 pt) */}
      <Page size={[PAGE_W, PAGE_H]} style={S.page}>
        <InfoTable ctx={ctx} meta={meta} />
        <PumTable plan={plan} />
        {signatureBlock && <SignatureSection data={signatureBlock} />}
      </Page>
    </Document>
  );
}

// ── Fusión con membrete usando pdf-lib ────────────────────────────────────────
// Carga membrete.pdf, copia su página 1 como fondo, y dibuja el contenido encima.
// Las áreas sin contenido (paddingTop) quedan transparentes → membrete visible.
async function applyMembrete(contentBuffer: Buffer): Promise<Buffer> {
  const membretePath = path.join(process.cwd(), "src", "templates", "membrete.pdf");
  const membreteBytes = fs.readFileSync(membretePath);

  const membreteDoc = await PDFDocument.load(membreteBytes);
  const contentDoc  = await PDFDocument.load(contentBuffer);
  const outputDoc   = await PDFDocument.create();

  const pageCount = contentDoc.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    // Base: copia la primera página del membrete (encabezado institucional)
    const [membretePage] = await outputDoc.copyPages(membreteDoc, [0]);
    outputDoc.addPage(membretePage);

    // Superpone el contenido generado por react-pdf
    const [embeddedContent] = await outputDoc.embedPdf(contentDoc, [i]);
    const { width, height } = membretePage.getSize();
    membretePage.drawPage(embeddedContent, { x: 0, y: 0, width, height });
  }

  return Buffer.from(await outputDoc.save());
}

// ── Export function ───────────────────────────────────────────────────────────

export async function buildPdfBuffer(plan: Planification, ctx: PlanContext, signatureBlock?: SignatureBlockData | null): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contentBuffer = await renderToBuffer(<PlanDocument plan={plan} ctx={ctx} signatureBlock={signatureBlock} /> as any);
  const content = Buffer.isBuffer(contentBuffer)
    ? contentBuffer
    : Buffer.from(contentBuffer as unknown as ArrayBuffer);

  return applyMembrete(content);
}
