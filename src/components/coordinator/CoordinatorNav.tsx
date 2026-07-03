"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";

const NAV_ITEMS = [
  {
    label: "Retroalimentación",
    href:  ROUTES.COORDINATOR.RETROALIMENTACION,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Docentes",
    href:  ROUTES.COORDINATOR.DOCENTES,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
] as const;

export function CoordinatorNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex-shrink-0 border-b border-pum-border/60 overflow-x-auto"
      style={{ background: "rgba(255,255,255,0.90)", backdropFilter: "blur(8px)" }}
    >
      <div className="flex items-stretch gap-0 px-4 max-w-7xl mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-2 px-4 py-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150"
              style={{ color: isActive ? "#002753" : "#737781" }}
            >
              <span style={{ color: isActive ? "#002753" : "currentColor", opacity: isActive ? 1 : 0.7 }}>
                {item.icon}
              </span>
              {item.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full"
                  style={{ background: "#002753" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
