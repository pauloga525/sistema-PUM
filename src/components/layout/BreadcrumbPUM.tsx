import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function BreadcrumbPUM({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Ubicación" className="flex items-center flex-wrap gap-1 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <span className="text-pum-text-disabled select-none" aria-hidden="true">
              ›
            </span>
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-pum-primary hover:underline underline-offset-2"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-pum-text font-medium" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
