// Columnas de ancho fijo: el texto se ajusta en vertical en lugar de expandir la tabla
export const HEADERS: { label: string; w: string; subtitle?: string; title?: string }[] = [
  { label: "#",                     w: "3%" },
  { label: "¿Qué van a aprender?",  w: "18%", subtitle: "Destreza con Criterio de Desempeño / Competencia",                              title: "DCD — Destrezas con Criterios de Desempeño: habilidades y conocimientos que el estudiante debe dominar" },
  { label: "¿Qué evaluar?",         w: "16%", subtitle: "Indicadores de evaluación",                                                     title: "Indicadores de logro: criterios observables para verificar que se alcanzó la destreza" },
  { label: "¿Cómo van a aprender?", w: "22%", subtitle: "Metodologías para los aprendizajes · Estrategias Metodológicas · DUA",         title: "Metodología y Principios DUA (Diseño Universal para el Aprendizaje): estrategias de enseñanza inclusiva" },
  { label: "Recursos",              w: "19%",                                                                                             title: "Materiales, herramientas y medios necesarios para la clase" },
  { label: "¿Cómo evaluar?",        w: "18%", subtitle: "Actividades de Evaluación / Técnicas / Instrumentos",                           title: "Técnicas e instrumentos de evaluación formativa y sumativa" },
];

/** colgroup + thead de la tabla PUM (la columna extra es la de eliminar fila). */
export function PlanTableHeader({ isFinalized }: { isFinalized: boolean }) {
  return (
    <>
      <colgroup>
        {HEADERS.map((h, i) => <col key={i} style={{ width: h.w }} />)}
        {!isFinalized && <col style={{ width: "4%" }} />}
      </colgroup>
      <thead>
        <tr
          className="text-xs font-semibold text-white"
          style={{ backgroundColor: "var(--pum-color-primary)" }}
        >
          {HEADERS.map((h, i) => (
            <th
              key={i}
              title={h.title}
              className={`px-3 py-2 border-r border-white/20 last:border-r-0 ${i === 0 ? "text-center" : "text-left"} ${h.title ? "cursor-help" : ""}`}
            >
              <span className="flex items-center gap-1 font-semibold text-xs leading-tight">
                {h.label}
                {h.title && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60 flex-shrink-0" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                )}
              </span>
              {h.subtitle && (
                <span className="block mt-1 text-[10px] font-normal italic opacity-80 leading-tight">
                  {h.subtitle}
                </span>
              )}
            </th>
          ))}
          {!isFinalized && <th className="w-8 px-1"><span className="sr-only">Acciones</span></th>}
        </tr>
      </thead>
    </>
  );
}
