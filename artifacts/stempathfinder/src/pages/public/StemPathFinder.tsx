import { Link } from "wouter";
import {
  FINDER_QUESTIONS,
  PATHWAYS,
  PATH_FINDER_DESCRIPTION,
  PATH_FINDER_H1,
  PATH_FINDER_INTRO,
  PATH_FINDER_TITLE,
  USAGE_EXAMPLES,
} from "@/lib/path-finder";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { Seo } from "@/components/Seo";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

const PATH = "/stem-path-finder";

/**
 * Orientation page for students who don't yet know what to search for.
 * All copy lives in src/lib/path-finder.ts so the build-time prerenderer
 * emits exactly the same text this component renders.
 */
export default function StemPathFinder() {
  const crumbs = [{ label: "STEM Path Finder" }];

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "STEM pathways for middle and high school students",
    itemListElement: PATHWAYS.map((pathway, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: pathway.name,
      url: `${absoluteUrl(PATH)}#${pathway.id}`,
    })),
  };

  return (
    <section className="mx-auto w-full max-w-[var(--page-width)] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <Seo
        title={PATH_FINDER_TITLE}
        description={PATH_FINDER_DESCRIPTION}
        path={PATH}
        jsonLd={[breadcrumbJsonLd(crumbs, PATH), itemList]}
      />
      <Breadcrumbs crumbs={crumbs} />
      <span className="font-annotation text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Start here
      </span>
      <h1 className="font-display mt-3 max-w-[760px] text-[32px] font-[660] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[44px]">
        {PATH_FINDER_H1}
      </h1>
      {PATH_FINDER_INTRO.map((paragraph, i) => (
        <p
          key={i}
          className="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-[var(--brand-muted-1)]"
        >
          {paragraph}
        </p>
      ))}

      <div className="mt-12">
        <h2 className="font-display text-[24px] font-semibold text-foreground">
          Six STEM pathways
        </h2>
        {PATHWAYS.map((pathway) => (
          <div
            key={pathway.id}
            id={pathway.id}
            className="mt-8 border-t border-border pt-6"
          >
            <h3 className="font-display text-[19px] font-semibold text-foreground">
              {pathway.name}
            </h3>
            <p className="mt-3 max-w-[680px] text-[16px] leading-[1.7] text-[var(--brand-muted-1)]">
              {pathway.summary}
            </p>
            <ul className="mt-4 max-w-[680px] list-disc space-y-2 pl-5 text-[15px] leading-[1.65] text-[var(--brand-muted-1)]">
              {pathway.startingPoints.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
              {pathway.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-14 border-t border-border pt-8">
        <h2 className="font-display text-[24px] font-semibold text-foreground">
          Five questions that narrow the field
        </h2>
        <p className="mt-3 max-w-[680px] text-[16px] leading-[1.7] text-[var(--brand-muted-1)]">
          Most students can rule out the majority of listings with five answers.
          Work through these before browsing — eligibility, not interest, is what
          actually removes options.
        </p>
        {FINDER_QUESTIONS.map((entry, i) => (
          <div key={i} className="mt-7">
            <h3 className="font-display text-[17px] font-semibold text-foreground">
              {entry.question}
            </h3>
            <p className="mt-2 max-w-[680px] text-[15px] leading-[1.7] text-[var(--brand-muted-1)]">
              {entry.why}
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
              {entry.links.map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-14 border-t border-border pt-8">
        <h2 className="font-display text-[24px] font-semibold text-foreground">
          How students actually use this
        </h2>
        {USAGE_EXAMPLES.map((example, i) => (
          <div key={i} className="mt-6 max-w-[680px]">
            <h3 className="font-display text-[16px] font-semibold text-foreground">
              {example.situation}
            </h3>
            <p className="mt-2 text-[15px] leading-[1.7] text-[var(--brand-muted-1)]">
              {example.approach}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-14 border-t border-border pt-8">
        <h2 className="font-display text-[20px] font-semibold text-foreground">
          Ready to look at real opportunities?
        </h2>
        <p className="mt-3 max-w-[680px] text-[16px] leading-[1.7] text-[var(--brand-muted-1)]">
          Every record in {SITE_NAME} was researched from the program's own
          website, with eligibility, cost, deadline and the official application
          link captured in one place. Details do change — always confirm on the
          official site before applying.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
          <li>
            <Link
              href="/database"
              className="text-primary underline-offset-4 hover:underline"
            >
              Browse every researched opportunity
            </Link>
          </li>
          <li>
            <Link
              href="/find"
              className="text-primary underline-offset-4 hover:underline"
            >
              Answer a few questions and get matches
            </Link>
          </li>
          <li>
            <Link
              href="/guides"
              className="text-primary underline-offset-4 hover:underline"
            >
              Read the application guides
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
