import Link from "next/link";
import type { NavItem } from "@/constants/routes";
import { NavIcon } from "./NavIcon";
import { NavBarLink } from "./NavBarLink";

/**
 * Navegación de un rol.
 *  - "bar":    barra horizontal bajo el encabezado, con resaltado del ítem activo.
 *  - "topbar": botones compactos dentro del encabezado (sin estado activo).
 */
export function RoleNav({
  items,
  variant,
  activeColor = "#002753",
  topbarTextClass = "text-blue-100/70",
}: {
  items: readonly NavItem[];
  variant: "bar" | "topbar";
  /** Solo "bar": color del ítem activo. */
  activeColor?: string;
  /** Solo "topbar": clase de color del texto. */
  topbarTextClass?: string;
}) {
  if (variant === "topbar") {
    return (
      <>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`pum-topbar-btn flex items-center gap-1.5 text-[12px] font-medium ${topbarTextClass} hover:text-white px-2.5 py-1.5 rounded-lg`}
          >
            {item.icon && <NavIcon name={item.icon} size={14} />}
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        ))}
      </>
    );
  }

  return (
    <nav
      className="flex-shrink-0 border-b border-pum-border/60 overflow-x-auto"
      style={{ background: "rgba(255,255,255,0.90)", backdropFilter: "blur(8px)" }}
    >
      <div className="flex items-stretch gap-0 px-4 max-w-7xl mx-auto">
        {items.map((item) => (
          <NavBarLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon && <NavIcon name={item.icon} />}
            activeColor={activeColor}
          />
        ))}
      </div>
    </nav>
  );
}
