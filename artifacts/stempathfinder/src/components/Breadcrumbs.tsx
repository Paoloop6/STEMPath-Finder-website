import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { absoluteUrl } from "@/lib/seo";

export interface Crumb {
  label: string;
  /** Site-relative path; omit for the current page. */
  href?: string;
}

/** Visible breadcrumb trail: Home > Section > Page. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const all: Crumb[] = [{ label: "Home", href: "/" }, ...crumbs];
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
        {all.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden="true" />}
            {crumb.href ? (
              <Link href={crumb.href} className="transition-colors hover:text-foreground">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-foreground">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** BreadcrumbList JSON-LD matching the visible trail. */
export function breadcrumbJsonLd(crumbs: Crumb[], currentPath: string): object {
  const all: Crumb[] = [{ label: "Home", href: "/" }, ...crumbs];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      item: absoluteUrl(crumb.href ?? currentPath),
    })),
  };
}
