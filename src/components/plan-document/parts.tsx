import { PRINCIPIO_COLORS } from "@/constants/planification";
import { formatPrincipioLabel, type MethodologySubItem } from "@/modules/planification/planification.types";

/** Guion para celdas vacías (light: filas de la tabla PUM y aportes). */
export function Dash({ light = false }: { light?: boolean }) {
  return <span className={light ? "text-gray-300" : "text-gray-400"}>—</span>;
}

/** Lista con viñetas de textos (indicadores, evaluaciones). */
export function ItemList({ items }: { items: string[] }) {
  const filled = items.filter(Boolean);
  if (!filled.length) return <Dash light />;
  return (
    <ul className="list-none m-0 p-0 space-y-0.5">
      {filled.map((t, j) => <li key={j} className="leading-snug whitespace-pre-wrap">• {t}</li>)}
    </ul>
  );
}

/** Badges de principios DUA; printClass agrega badge-pN para conservar el color al imprimir. */
export function PrincipioBadges({
  principles,
  printClass = false,
}: {
  principles: NonNullable<MethodologySubItem["principles"]>;
  printClass?: boolean;
}) {
  if (!principles.length) return null;
  return (
    <span className="flex gap-0.5 flex-wrap">
      {principles.map((p) => (
        <span
          key={p.principio}
          className={printClass ? `badge badge-p${p.principio}` : "badge"}
          style={{ backgroundColor: PRINCIPIO_COLORS[p.principio as 1 | 2 | 3] }}
        >
          {formatPrincipioLabel(p as Parameters<typeof formatPrincipioLabel>[0])}
        </span>
      ))}
    </span>
  );
}
