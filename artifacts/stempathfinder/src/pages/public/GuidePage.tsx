import { Link, useParams } from "wouter";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { Breadcrumbs, breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { Seo } from "@/components/Seo";
import NotFound from "@/pages/not-found";

/** Index of all guides at /guides. */
export function GuidesIndex() {
  return (
    <section className="mx-auto w-full max-w-[var(--story-width)] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <Seo
        title="Guides to STEM Opportunities and Internships"
        description="Guides for high school students on finding summer internships, research programs, free STEM programs, and application timelines."
        path="/guides"
        jsonLd={[breadcrumbJsonLd([{ label: "Guides" }], "/guides")]}
      />
      <Breadcrumbs crumbs={[{ label: "Guides" }]} />
      <h1 className="font-display mt-3 text-[32px] font-[660] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[44px]">
        Guides for Students
      </h1>
      <p className="mt-4 max-w-[620px] text-[16px] leading-[1.6] text-[var(--brand-muted-1)]">
        Practical, original guides on finding and winning STEM opportunities — written to answer the
        questions students actually have.
      </p>
      <div className="mt-10 border-t border-border">
        {GUIDES.map((guide) => (
          <div key={guide.slug} className="border-b border-border py-6">
            <h2 className="font-display text-[19px] font-semibold text-foreground">
              <Link href={`/guides/${guide.slug}`} className="hover:underline">
                {guide.title}
              </Link>
            </h2>
            <p className="mt-1.5 max-w-[680px] text-[14px] leading-[1.6] text-[var(--brand-muted-1)]">
              {guide.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** One guide at /guides/:slug. */
export default function GuidePage() {
  const params = useParams<{ slug: string }>();
  const guide = guideBySlug(params.slug ?? "");
  if (!guide) return <NotFound />;

  const path = `/guides/${guide.slug}`;
  const crumbs = [{ label: "Guides", href: "/guides" }, { label: guide.h1 }];

  return (
    <article className="mx-auto w-full max-w-[var(--story-width)] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <Seo
        title={guide.title}
        description={guide.description}
        path={path}
        ogType="article"
        jsonLd={[breadcrumbJsonLd(crumbs, path)]}
      />
      <Breadcrumbs crumbs={crumbs} />
      <h1 className="font-display mt-3 max-w-[760px] text-[30px] font-[660] leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[42px]">
        {guide.h1}
      </h1>
      <p className="mt-5 max-w-[680px] text-[17px] leading-[1.7] text-[var(--brand-muted-1)]">{guide.intro}</p>

      {guide.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="font-display text-[22px] font-semibold text-foreground">{section.heading}</h2>
          {section.paragraphs.map((paragraph, i) => (
            <p key={i} className="mt-3 max-w-[680px] text-[15px] leading-[1.7] text-[var(--brand-muted-1)]">
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      <div className="mt-12 border-t border-border pt-8">
        <h2 className="font-display text-[18px] font-semibold text-foreground">Explore opportunities</h2>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">
          {guide.links.map(([label, href]) => (
            <li key={href}>
              <Link href={href} className="text-primary underline-offset-4 hover:underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
