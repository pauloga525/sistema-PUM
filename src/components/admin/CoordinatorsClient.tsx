// Sin estado propio: componente de servidor; las piezas interactivas viven en ./coordinators
import { CoordinatorCard } from "./coordinators/CoordinatorCard";
import { CreateCoordinatorPanel } from "./coordinators/CreateCoordinatorPanel";
import type { CoordinatorEntry, SubjectOption, TeacherOption } from "./coordinators/types";

interface Props {
  coordinators: CoordinatorEntry[];
  teachers:     TeacherOption[];
  subjects:     SubjectOption[];
}

// ── Componente principal ───────────────────────────────────────────────────────

export function CoordinatorsClient({ coordinators, teachers, subjects }: Props) {
  return (
    <div className="flex-1 flex flex-col p-6 sm:p-8 max-w-5xl mx-auto w-full">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
        <div>
          <h1 className="text-2xl font-semibold text-pum-text">Coordinadores de Área</h1>
          <p className="text-sm text-pum-text-muted mt-0.5">
            Gestiona coordinadores y los docentes que supervisan.
          </p>
        </div>
        <CreateCoordinatorPanel teachers={teachers} />
      </div>

      {/* Estadísticas */}
      {coordinators.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Coordinadores",         value: coordinators.length },
            { label: "Docentes supervisados",  value: new Set(coordinators.flatMap((c) => c.teachers.map((t) => t.teacherId))).size },
            { label: "PUMs aprobados",         value: `${coordinators.reduce((s, c) => s + c.progress.approved, 0)} / ${coordinators.reduce((s, c) => s + c.progress.total, 0)}` },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{
                background:     "rgba(255,255,255,0.85)",
                backdropFilter: "blur(12px)",
                border:         "1px solid rgba(195,198,210,0.70)",
                boxShadow:      "0 2px 8px rgba(0,39,83,0.04)",
              }}
            >
              <p className="text-2xl font-bold text-pum-text">{stat.value}</p>
              <p className="text-xs text-pum-text-muted leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Vacío */}
      {coordinators.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div
            className="text-center rounded-2xl px-10 py-12 max-w-sm"
            style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(195,198,210,0.70)" }}
          >
            <div
              className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: "rgba(0,39,83,0.06)" }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#002753" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="3" /><path d="M3 20v-1a5 5 0 0 1 5-5h2" />
                <circle cx="17" cy="11" r="3" /><path d="M13 20v-1a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5v1" />
              </svg>
            </div>
            <p className="text-base font-semibold text-pum-text mb-1">Sin coordinadores</p>
            <p className="text-sm text-pum-text-muted">Crea el primer coordinador de área con el botón de arriba.</p>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-4">
        {coordinators.map((entry) => (
          <CoordinatorCard key={entry.id} entry={entry} teachers={teachers} subjects={subjects} />
        ))}
      </div>
    </div>
  );
}
