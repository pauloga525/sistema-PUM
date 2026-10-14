/**
 * CSS del documento PUM. "preview" incluye las reglas de impresión (A4
 * horizontal, colores exactos); "review" el resaltado de filas comentadas.
 */

const PRINT_CSS = `
  @page { size: A4 landscape; margin: 10mm 12mm; }
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; margin: 0 !important; font-size: 9pt; }
    .print-page { padding: 0 !important; max-width: none !important; box-shadow: none !important; border-radius: 0 !important; border: none !important; }
    table { border-collapse: collapse !important; }
    .hdr-blue { background-color: #1E40AF !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hdr-section { background-color: #BFDBFE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hdr-green { background-color: #E0F2FE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hdr-dua-p1 { background-color: #6EE7B7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hdr-dua-p2 { background-color: #C4B5FD !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hdr-dua-p3 { background-color: #7DD3FC !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pum-row-odd td { background-color: #F1F5F9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge-p1 { background-color: #059669 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge-p2 { background-color: #7C3AED !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge-p3 { background-color: #0EA5E9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .doc-table { page-break-inside: auto; }
    .doc-table tr { page-break-inside: avoid; }
  }
  .hdr-green { background-color: #E0F2FE; }
  .badge-p1 { background-color: #059669; }
  .badge-p2 { background-color: #7C3AED; }
  .badge-p3 { background-color: #0EA5E9; }
`;

const BASE_CSS = `
  .hdr-blue { background-color: #1E40AF; }
  .hdr-section { background-color: #BFDBFE; }
  .hdr-dua-p1 { background-color: #6EE7B7; }
  .hdr-dua-p2 { background-color: #C4B5FD; }
  .hdr-dua-p3 { background-color: #7DD3FC; }
  .pum-row-odd td { background-color: #F1F5F9; }
  .doc-table { border-collapse: collapse; width: 100%; font-size: 0.72rem; }
  .doc-table td, .doc-table th { border: 1px solid #94A3B8; padding: 3px 5px; vertical-align: top; }
  .lbl { font-weight: 700; color: #1e3a8a; white-space: nowrap; }
  .badge { display: inline-flex; align-items: center; justify-content: center; border-radius: 3px; padding: 1px 4px; font-size: 0.6rem; font-weight: 700; color: white; margin-right: 3px; flex-shrink: 0; }
`;

const REVIEW_CSS = `
  .pum-row-commented td { background-color: rgba(249,115,22,0.09) !important; }
  .pum-row-comment-bar td { background-color: rgba(249,115,22,0.16); border-bottom: 2px solid rgba(249,115,22,0.35); }
`;

export function PlanDocumentStyles({ variant }: { variant: "preview" | "review" }) {
  // Las reglas de impresión van después de las base para que sus !important no dependan del orden
  return <style>{variant === "preview" ? BASE_CSS + PRINT_CSS : BASE_CSS + REVIEW_CSS}</style>;
}
