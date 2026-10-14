"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Enlace de la barra de navegación; se resalta cuando la ruta actual cae bajo `href`. */
export function NavBarLink({
  href,
  label,
  icon,
  activeColor,
}: {
  href: string;
  label: string;
  icon?: ReactNode;
  activeColor: string;
}) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className="relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150"
      style={{ color: isActive ? activeColor : "#737781" }}
    >
      {icon && (
        <span style={{ color: isActive ? activeColor : "currentColor", opacity: isActive ? 1 : 0.7 }}>
          {icon}
        </span>
      )}
      {label}
      {isActive && (
        <span
          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
          style={{ background: activeColor }}
        />
      )}
    </Link>
  );
}
