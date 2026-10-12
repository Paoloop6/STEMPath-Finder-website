import { Link, useParams } from "wouter";
import { titleFromHistory } from "@/lib/open-transition";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building,
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  GraduationCap,
  MapPin,
  Trophy,
  AlertCircle,
  BadgeCheck,
} from "lucide-react";
import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "@/components/Breadcrumbs";
import { Seo } from "@/components/Seo";
import { absoluteUrl, idFromSlugParam, opportunityPath, SITE_NAME } from "@/lib/seo";
import { fetchDatabaseRecords, humanize, type DatabaseRecord } from "@/lib/database-records";
import { OpportunityRow } from "@/components/OpportunityRow";
import { BROWSE_PAGES } from "@/lib/browse-pages";

/** Unified view over the DynamoDB (normalized) and legacy Postgres shapes. */
interface DetailOpportunity {
  apiId: string;
  numericId: number | null;
  title: string;
  organization: string | null;
  opportunityType: string | null;
  stemFields: string[];
  description: string | null;
  eligibility: string | null;
  gradeLevels: string | null;
  minAge: number | null;
  maxAge: number | null;
  location: string | null;
  remoteStatus: string | null;
  deadline: string | null;
  applicationOpenDate: string | null;
  applicationStatus: string | null;
  cost: string | null;
  compensation: string | null;
  officialUrl: string | null;
  applicationUrl: string | null;
  experienceLevel: string | null;
  timeCommitment: string | null;
  lastVerified: string | null;
  createdAt: string | null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function normalizeDetail(raw: Record<string, unknown>): DetailOpportunity {
  const isLegacy = typeof raw["name"] === "string";
  const grades = raw["gradeLevels"];
  return {
    apiId: String(raw["opportunityId"] ?? raw["id"] ?? ""),
    numericId:
      typeof raw["numericId"] === "number"
        ? raw["numericId"]
        : typeof raw["id"] === "number"
          ? raw["id"]
          : null,
    title: asString(raw["title"]) ?? asString(raw["name"]) ?? "Untitled opportunity",
    organization: asString(raw["organization"]),
    opportunityType: asString(raw["opportunityType"]) ?? asString(raw["category"]),
    stemFields: Array.isArray(raw["stemFields"])
      ? (raw["stemFields"] as string[])
      : asString(raw["stemField"])
        ? [raw["stemField"] as string]
        : [],
    description: asString(raw["description"]) ?? asString(raw["summary"]),
    eligibility: asString(raw["eligibility"]) ?? asString(raw["requirements"]),
    gradeLevels: Array.isArray(grades)
      ? (grades as unknown[]).join(", ")
      : asString(raw["eligibleGrades"]),
    minAge: typeof raw["minAge"] === "number" ? raw["minAge"] : null,
    maxAge: typeof raw["maxAge"] === "number" ? raw["maxAge"] : null,
    location: asString(raw["location"]),
    remoteStatus:
      asString(raw["remoteStatus"]) === "unknown"
        ? null
        : (asString(raw["remoteStatus"]) ?? asString(raw["format"])),
    deadline: asString(raw["deadline"]),
    applicationOpenDate: asString(raw["applicationOpenDate"]),
    applicationStatus: asString(raw["applicationStatus"]),
    cost: asString(raw["cost"]) ?? asString(raw["costAmount"]) ?? asString(raw["costCategory"]),
    compensation: asString(raw["compensation"]),
    officialUrl: asString(raw["officialUrl"]),
    applicationUrl: asString(raw["applicationUrl"]) ?? asString(raw["officialUrl"]),
    experienceLevel: asString(raw["experienceLevel"]),
    timeCommitment: asString(raw["timeCommitment"]),
    lastVerified:
      asString(raw["lastCheckedAt"]) ??
      asString(raw["updatedAt"]) ??
      asString(raw["lastVerifiedDate"]),
    createdAt: asString(raw["createdAt"]),
  };
}

type Status = "open" | "upcoming" | "closed" | "deadline-passed" | null;

function statusOf(o: DetailOpportunity): Status {
  if (o.deadline) {
    const t = Date.parse(o.deadline);
    if (!Number.isNaN(t) && t < Date.now() - 24 * 3600 * 1000) return "deadline-passed";
  }
  const s = (o.applicationStatus ?? "").toLowerCase();
  if (s === "open" || s === "upcoming" || s === "closed") return s;
  return null;
}

const STATUS_DISPLAY: Record<Exclude<Status, null>, { label: string; className: string }> = {
  open: { label: "Open", className: "border-emerald-500/40 text-emerald-500" },
  upcoming: { label: "Upcoming", className: "border-amber-500/40 text-amber-500" },
  closed: { label: "Closed", className: "border-red-500/40 text-red-500" },
  "deadline-passed": { label: "Deadline passed", className: "border-red-500/40 text-red-500" },
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function metaDescription(o: DetailOpportunity): string {
  const pieces: string[] = [`Explore ${o.title}`];
  const kind = [
    o.compensation ? "paid" : null,
    o.opportunityType ? humanize(o.opportunityType).toLowerCase() : "opportunity",
  ]
    .filter(Boolean)
    .join(" ");
  pieces[0] += `, a ${kind} for high school students`;
  if (o.location) pieces[0] += ` in ${o.location}`;
  pieces.push(
    "View eligibility, dates, deadline, requirements, and the official application link.",
  );
  return `${pieces[0]}. ${pieces[1]}`;
}

function seoTitle(o: DetailOpportunity): string {
  const isInternship = (o.opportunityType ?? "").toLowerCase().includes("internship");
  return isInternship
    ? `${o.title} – Summer Internship for High School Students`
    : `${o.title} | ${SITE_NAME}`;
}

// JobPosting markup was removed deliberately. Google requires structured data
// to reflect the page's visible content and to be accurate. The previous block
// hardcoded employmentType "INTERN" and a United States applicant-location
// requirement, and mapped datePosted to the date our crawler first saw the
// record. None of that is displayed or verified, and many of these listings are
// unpaid academic programs rather than employment. EducationalOccupationalProgram
// would be the correct type, but only once the records genuinely carry the
// fields it requires.

async function fetchDetail(id: string): Promise<DetailOpportunity> {
  const response = await fetch(`/api/opportunities/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`Opportunity not found (${response.status}).`);
  return normalizeDetail((await response.json()) as Record<string, unknown>);
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-start p-4 hover:bg-muted/10 transition-colors">
      <div className="text-primary/70 mr-4 mt-0.5 w-5 h-5 flex-shrink-0 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-0.5">{label}</p>
        <p className="text-foreground font-medium">{value}</p>
      </div>
    </li>
  );
}

export default function OpportunityDetail() {
  const params = useParams<{ id: string }>();
  const apiId = idFromSlugParam(params.id ?? "");

  const { data: opportunity, isLoading, isError } = useQuery({
    queryKey: ["opportunity-detail", apiId],
    queryFn: () => fetchDetail(apiId),
    enabled: Boolean(apiId),
    retry: false,
  });

  // Similar opportunities come from the same cached browse dataset.
  const { data: browseData } = useQuery({
    queryKey: ["database-records"],
    queryFn: () => fetchDatabaseRecords(),
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Skeleton className="h-6 w-32 mb-6" />
          {titleFromHistory() ? (
            <h1
              className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4"
              style={{ viewTransitionName: "opp-title" }}
            >
              {titleFromHistory()}
            </h1>
          ) : (
            <Skeleton className="h-12 w-3/4 mb-4" />
          )}
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-60 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (isError || !opportunity) {
    return (
      <MainLayout>
        <Seo title="Opportunity not found" robots="noindex, follow" />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Opportunity not found</h1>
          <p className="text-muted-foreground mb-6">
            This opportunity doesn't exist or has been removed.
          </p>
          <Link href="/database">
            <Button>Browse all opportunities</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const canonicalPath = opportunityPath(
    opportunity.title,
    opportunity.numericId ?? opportunity.apiId,
  );
  const status = statusOf(opportunity);
  const statusDisplay = status ? STATUS_DISPLAY[status] : null;
  const typeLabel = humanize(opportunity.opportunityType);
  const crumbs: Crumb[] = [
    { label: "Opportunities", href: "/database" },
    { label: opportunity.title },
  ];

  const jsonLd: object[] = [
    breadcrumbJsonLd(crumbs, canonicalPath),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: opportunity.title,
      url: absoluteUrl(canonicalPath),
      ...(opportunity.description ? { description: opportunity.description } : {}),
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
    },
  ];

  const similar = (browseData?.records ?? [])
    .filter(
      (r) =>
        r.id !== opportunity.apiId &&
        String(r.numeric_id ?? "") !== String(opportunity.numericId ?? "∅") &&
        ((opportunity.opportunityType &&
          r.opportunity_type === opportunity.opportunityType) ||
          (Array.isArray(r.stem_fields) &&
            r.stem_fields.some((f) => opportunity.stemFields.includes(f)))),
    )
    .slice(0, 5);

  const relatedCategories = BROWSE_PAGES.filter((page) => page.group === "category")
    .filter((page) => {
      const probe: DatabaseRecord = {
        id: opportunity.apiId,
        numeric_id: opportunity.numericId,
        title: opportunity.title,
        organization: opportunity.organization,
        opportunity_type: opportunity.opportunityType,
        stem_fields: opportunity.stemFields,
        eligible_grades: opportunity.gradeLevels,
        location: opportunity.location,
        cost: opportunity.cost,
        compensation: opportunity.compensation,
        application_status: opportunity.applicationStatus,
        application_deadline: opportunity.deadline,
        official_url: opportunity.officialUrl,
        application_url: opportunity.applicationUrl,
        program_format: opportunity.remoteStatus,
        experience_level: opportunity.experienceLevel,
        time_commitment: opportunity.timeCommitment,
        good_for: opportunity.description,
        last_verified_at: opportunity.lastVerified,
        checked_at: opportunity.lastVerified,
        discovered_at: opportunity.createdAt,
        review_status: "approved",
        published: true,
      };
      try {
        return page.filter(probe);
      } catch {
        return false;
      }
    })
    .slice(0, 4);

  return (
    <MainLayout>
      <Seo
        title={seoTitle(opportunity)}
        description={metaDescription(opportunity)}
        path={canonicalPath}
        jsonLd={jsonLd}
      />

      {/* Header banner */}
      <div className="bg-primary/5 border-b border-border py-12 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Breadcrumbs crumbs={crumbs} />

          <div className="flex flex-wrap gap-2 mb-4">
            {typeLabel && (
              <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground">
                {typeLabel}
              </Badge>
            )}
            {statusDisplay && (
              <Badge variant="outline" className={statusDisplay.className}>
                {statusDisplay.label}
              </Badge>
            )}
            {opportunity.compensation && (
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                {opportunity.compensation}
              </Badge>
            )}
          </div>

          <h1
            className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4"
            style={{ viewTransitionName: "opp-title" }}
          >
            {opportunity.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-muted-foreground text-lg">
            {opportunity.organization && (
              <span className="flex items-center gap-2 text-foreground font-medium">
                <Building className="w-5 h-5 text-primary" /> {opportunity.organization}
              </span>
            )}
            {opportunity.location && (
              <span className="flex items-center gap-2">
                <MapPin className="w-5 h-5" /> {opportunity.location}
                {opportunity.remoteStatus ? ` · ${humanize(opportunity.remoteStatus)}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-10">
            {(status === "closed" || status === "deadline-passed") && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-600">
                {status === "deadline-passed"
                  ? "The listed application deadline has passed. Many programs run every year — check the official site for the next application cycle."
                  : "Applications are currently closed. Recurring programs usually reopen before the next cycle — check the official site for dates."}
              </div>
            )}

            {opportunity.description && (
              <section>
                <h2 className="text-2xl font-serif font-bold mb-4">Program Overview</h2>
                <p className="whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground">
                  {opportunity.description}
                </p>
              </section>
            )}

            {(opportunity.eligibility ||
              opportunity.gradeLevels ||
              opportunity.minAge != null ||
              opportunity.maxAge != null ||
              opportunity.experienceLevel) && (
              <section>
                <h2 className="text-2xl font-serif font-bold mb-4">Eligibility</h2>
                <div className="bg-muted/30 rounded-xl p-6 border border-border space-y-2 text-foreground leading-relaxed">
                  {opportunity.gradeLevels && <p>Eligible grades: {opportunity.gradeLevels}</p>}
                  {(opportunity.minAge != null || opportunity.maxAge != null) && (
                    <p>
                      Ages:{" "}
                      {[
                        opportunity.minAge != null ? `${opportunity.minAge}+` : null,
                        opportunity.maxAge != null ? `up to ${opportunity.maxAge}` : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {opportunity.experienceLevel && (
                    <p>Experience level: {humanize(opportunity.experienceLevel)}</p>
                  )}
                  {opportunity.eligibility && (
                    <p className="whitespace-pre-wrap">{opportunity.eligibility}</p>
                  )}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-2xl font-serif font-bold mb-4">Important Dates</h2>
              <ul className="space-y-2 text-foreground">
                {opportunity.applicationOpenDate && (
                  <li>Applications open: {formatDate(opportunity.applicationOpenDate)}</li>
                )}
                <li>
                  Application deadline:{" "}
                  {formatDate(opportunity.deadline) ?? "Rolling / not specified — check the official site"}
                </li>
                {opportunity.timeCommitment && <li>Time commitment: {opportunity.timeCommitment}</li>}
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-serif font-bold mb-4">How to Apply</h2>
              <p className="text-muted-foreground leading-relaxed">
                Applications are handled on the program's official website — STEMPath Finder never
                collects applications. Verify all details at the source before applying.
              </p>
              {opportunity.applicationUrl && (
                <Button className="mt-4" asChild>
                  <a href={opportunity.applicationUrl} target="_blank" rel="noopener noreferrer">
                    Apply on the official site <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              )}
            </section>

            {similar.length > 0 && (
              <section>
                <h2 className="text-2xl font-serif font-bold mb-2">Similar Opportunities</h2>
                <div>
                  {similar.map((record) => (
                    <OpportunityRow key={record.id} record={record} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="border-card-border shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
              <CardContent className="p-6">
                {opportunity.officialUrl ? (
                  <Button className="w-full h-12 text-lg font-bold mb-4 shadow-sm" asChild>
                    <a href={opportunity.officialUrl} target="_blank" rel="noopener noreferrer">
                      Visit Official Site <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">No official link on file.</p>
                )}
                <p className="text-xs text-center text-muted-foreground">
                  Applications are handled on the official website.
                </p>
              </CardContent>
            </Card>

            <Card className="border-card-border">
              <CardHeader className="bg-muted/20 border-b border-border pb-4">
                <CardTitle className="text-lg font-serif">Key Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {opportunity.gradeLevels && (
                    <DetailRow icon={<GraduationCap />} label="Eligible Grades" value={opportunity.gradeLevels} />
                  )}
                  {opportunity.stemFields.length > 0 && (
                    <DetailRow icon={<Trophy />} label="STEM Field" value={opportunity.stemFields.join(", ")} />
                  )}
                  {opportunity.cost && (
                    <DetailRow icon={<DollarSign />} label="Cost" value={opportunity.cost} />
                  )}
                  {opportunity.compensation && (
                    <DetailRow icon={<DollarSign />} label="Compensation" value={opportunity.compensation} />
                  )}
                  <DetailRow
                    icon={<Calendar />}
                    label="Deadline"
                    value={formatDate(opportunity.deadline) ?? "Rolling / Not specified"}
                  />
                  {opportunity.timeCommitment && (
                    <DetailRow icon={<Clock />} label="Commitment" value={opportunity.timeCommitment} />
                  )}
                  {opportunity.remoteStatus && (
                    <DetailRow icon={<Building />} label="Format" value={humanize(opportunity.remoteStatus)} />
                  )}
                </ul>
              </CardContent>
            </Card>

            {opportunity.lastVerified && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BadgeCheck className="size-3.5 text-emerald-500" />
                Last verified: {formatDate(opportunity.lastVerified)}
              </p>
            )}

            {relatedCategories.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-2">Browse related</h2>
                <ul className="space-y-1.5 text-sm">
                  {relatedCategories.map((page) => (
                    <li key={page.path}>
                      <Link href={page.path} className="text-primary underline-offset-4 hover:underline">
                        {page.h1}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
