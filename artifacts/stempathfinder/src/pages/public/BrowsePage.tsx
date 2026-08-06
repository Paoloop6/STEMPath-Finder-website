import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { fetchDatabaseRecords } from "@/lib/database-records";
import { browsePageByPath, BROWSE_PAGES, type BrowsePage } from "@/lib/browse-pages";
import { OpportunityRow } from "@/components/OpportunityRow";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { Seo } from "@/components/Seo";
import NotFound from "@/pages/not-found";

const GROUP_CRUMB: Record<BrowsePage["group"], string> = {
  category: "Browse",
  location: "Locations",
  grade: "By grade",
};

/**
 * Template for every indexable category, location, and grade page. Same
 * data source as /database, but with a stable URL, unique copy, and normal
 * HTML links Google can follow.
 */
export default function BrowsePageView({ path }: { path: string }) {
  const page = browsePageByPath(path);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["database-records"],
    queryFn: () => fetchDatabaseRecords(),
    staleTime: 30 * 1000,
  });

  if (!page) return <NotFound />;

  const matched = (data?.records ?? []).filter(page.filter);
  const related = page.related
    .map((p) => BROWSE_PAGES.find((entry) => entry.path === p))
    .filter((entry): entry is BrowsePage => Boolean(entry));
  const crumbs = [{ label: page.h1 }];

  return (
    <section className="mx-auto w-full max-w-[var(--page-width)] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <Seo
        title={page.title}
        description={page.description}
        path={page.path}
        robots={page.noindex ? "noindex, follow" : "index, follow"}
        jsonLd={[breadcrumbJsonLd(crumbs, page.path)]}
      />
      <Breadcrumbs crumbs={crumbs} />
      <span className="font-annotation text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {GROUP_CRUMB[page.group]}
      </span>
      <h1 className="font-display mt-3 max-w-[760px] text-[32px] font-[660] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[44px]">
        {page.h1}
      </h1>
      {page.intro.map((paragraph, i) => (
        <p key={i} className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-[var(--brand-muted-1)]">
          {paragraph}
        </p>
      ))}

      <div className="mt-8">
        <h2 className="font-display text-[20px] font-semibold text-foreground">
          Matching opportunities
        </h2>
        {isLoading ? (
          <p className="mt-4 text-[14px] text-muted-foreground">Loading the researched database…</p>
        ) : isError ? (
          <p className="mt-4 text-[14px] text-[var(--brand-error)]">
            Could not load the database right now. Try the{" "}
            <Link href="/database" className="text-primary underline-offset-4 hover:underline">
              full database
            </Link>{" "}
            instead.
          </p>
        ) : matched.length === 0 ? (
          <p className="mt-4 max-w-[620px] text-[14px] text-[var(--brand-muted-1)]">
            No listings currently match this page — the database refreshes daily as new programs are
            researched. Browse{" "}
            <Link href="/database" className="text-primary underline-offset-4 hover:underline">
              every researched opportunity
            </Link>{" "}
            in the meantime.
          </p>
        ) : (
          <div className="mt-3">
            {matched.map((record) => (
              <OpportunityRow key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="mt-12 border-t border-border pt-8">
          <h2 className="font-display text-[18px] font-semibold text-foreground">Related pages</h2>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
            {related.map((entry) => (
              <li key={entry.path}>
                <Link href={entry.path} className="text-primary underline-offset-4 hover:underline">
                  {entry.h1}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/database" className="text-primary underline-offset-4 hover:underline">
                Full opportunity database
              </Link>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
