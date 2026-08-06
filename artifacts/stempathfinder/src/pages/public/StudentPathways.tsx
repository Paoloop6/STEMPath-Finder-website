import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import {
  ArrowUpRight,
  BadgeCheck,
  FileText,
  GraduationCap,
  Info,
} from "lucide-react";
import {
  UNIVERSITIES,
  UNIVERSITY_GROUPS,
  matchUniversity,
  type UniversityCategory,
} from "@/data/universities";
import { UniversityLogo } from "@/components/UniversityLogo";
import { Seo } from "@/components/Seo";

/**
 * Student Pathways — real STEM extracurricular pathways from publicly shared
 * applicant profiles (EC Database), reviewed before publishing. All reads go
 * through the server; the browser never touches DynamoDB or S3.
 */

type PathwayActivity = {
  id: string;
  title: string;
  experienceType: string;
  stemField: string;
  organization: string | null;
  role: string | null;
  description: string;
  termType: string;
  skills: string[];
  sourceUrl: string;
  evidenceUrls: string[];
  evidenceStatus: "self_reported" | "supported";
  reviewStatus: string;
};

type PathwayAward = {
  id: string;
  name: string;
  category: string;
  level: string;
  year: number | null;
  sourceUrl: string;
};

type Pathway = {
  profileId: string;
  anonymousLabel: string;
  intendedMajors: string[];
  acceptedSchools: string[];
  stemFields: string[];
  sourceUrl: string;
  sourceVideoUrls: string[];
  activities: PathwayActivity[];
  awards: PathwayAward[];
};

const STEM_MAJOR_CHIPS = [
  "Computer Science",
  "Engineering",
  "Biology",
  "Mathematics",
  "Environmental Science",
  "Physics",
  "Chemistry",
  "Medicine",
  "Neuroscience",
  "Data Science",
] as const;

const EXPERIENCE_TYPES = [
  "research",
  "internship",
  "project",
  "competition",
  "club",
  "program",
  "publication",
  "tutoring",
  "outreach",
  "clinical",
] as const;

// ---------------------------------------------------------------------------
// URL query-string state
// ---------------------------------------------------------------------------

function useUrlFilters() {
  const search = useSearch();
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(search);

  const getList = (key: string): string[] =>
    (params.get(key) ?? "").split(",").filter(Boolean);

  const setList = (key: string, values: string[]): void => {
    const next = new URLSearchParams(search);
    if (values.length > 0) next.set(key, values.join(","));
    else next.delete(key);
    const qs = next.toString();
    setLocation(qs ? `${location}?${qs}` : location, { replace: true });
  };

  return {
    schools: getList("schools"),
    majors: getList("majors"),
    types: getList("types"),
    toggle(key: "schools" | "majors" | "types", value: string) {
      const current = getList(key);
      setList(
        key,
        current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      );
    },
    clear() {
      setLocation(location, { replace: true });
    },
  };
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-white/15 text-muted-foreground hover:border-white/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function SourceBadge({ activity }: { activity: PathwayActivity }) {
  return activity.evidenceStatus === "supported" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      <BadgeCheck className="h-3 w-3" /> Source-linked
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      <FileText className="h-3 w-3" /> Self-reported
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StudentPathways() {
  const filters = useUrlFilters();

  const { data, isLoading, error } = useQuery<Pathway[]>({
    queryKey: ["pathways"],
    queryFn: async () => {
      const response = await fetch("/api/pathways");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    staleTime: 60_000,
  });

  const pathways = useMemo(() => {
    if (!data) return [];
    return data
      .map((p) => {
        const universityIds = p.acceptedSchools
          .map((s) => matchUniversity(s)?.id)
          .filter((id): id is string => Boolean(id));
        return { ...p, universityIds };
      })
      .filter((p) => {
        if (
          filters.schools.length > 0 &&
          !p.universityIds.some((id) => filters.schools.includes(id))
        ) {
          return false;
        }
        if (filters.majors.length > 0) {
          const haystack = [...p.intendedMajors, ...p.stemFields]
            .join(" ")
            .toLowerCase();
          if (!filters.majors.some((m) => haystack.includes(m.toLowerCase()))) {
            return false;
          }
        }
        if (
          filters.types.length > 0 &&
          !p.activities.some((a) => filters.types.includes(a.experienceType))
        ) {
          return false;
        }
        return p.activities.length > 0 || p.awards.length > 0;
      });
  }, [data, filters.schools, filters.majors, filters.types]);

  const groups = Object.entries(UNIVERSITY_GROUPS) as [
    UniversityCategory,
    string,
  ][];
  const anyFilter =
    filters.schools.length + filters.majors.length + filters.types.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <Seo
        title="Student Pathways: Real Routes Into Top STEM Colleges"
        description="Explore anonymized pathways of real students — the activities, awards, and programs that led to acceptances at top STEM universities."
        path="/student-pathways"
      />
      <header className="mb-8">
        <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <GraduationCap className="h-4 w-4" /> Student pathways
        </p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          Real STEM pathways from admitted students
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          STEM activities and awards from publicly shared applicant profiles on{" "}
          <a
            href="https://ecdatabase.org"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            EC Database
          </a>
          , filtered to the experiences that shaped each student&apos;s path.
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            These activities describe what admitted students did — they do not
            prove any activity caused an admission decision. Most entries are
            self-reported by students; entries marked source-linked include an
            outside link, which is preserved unverified.
          </span>
        </div>
      </header>

      {/* University filter cards */}
      <section aria-label="Filter by university" className="mb-6 space-y-4">
        {groups.map(([category, label]) => (
          <div key={category}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </h2>
            <div className="flex flex-wrap gap-2">
              {UNIVERSITIES.filter((uni) => uni.category === category).map(
                (uni) => {
                  const active = filters.schools.includes(uni.id);
                  return (
                    <button
                      key={uni.id}
                      type="button"
                      onClick={() => filters.toggle("schools", uni.id)}
                      aria-pressed={active}
                      className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-xs transition-colors ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-white/10 bg-white/5 hover:border-white/25"
                      }`}
                    >
                      <UniversityLogo
                        university={uni}
                        size={36}
                        className={active ? "ring-2 ring-primary" : ""}
                      />
                      <span className="pr-1 font-medium">{uni.shortName}</span>
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Major + experience-type chips */}
      <section className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            STEM major
          </span>
          {STEM_MAJOR_CHIPS.map((major) => (
            <Chip
              key={major}
              label={major}
              active={filters.majors.includes(major)}
              onClick={() => filters.toggle("majors", major)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Experience type
          </span>
          {EXPERIENCE_TYPES.map((type) => (
            <Chip
              key={type}
              label={type}
              active={filters.types.includes(type)}
              onClick={() => filters.toggle("types", type)}
            />
          ))}
          {anyFilter && (
            <button
              type="button"
              onClick={filters.clear}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* Results */}
      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading pathways…
        </p>
      )}
      {error != null && (
        <p className="py-16 text-center text-sm text-destructive">
          Could not load pathways. Is the API server running?
        </p>
      )}
      {!isLoading && !error && (
        <>
          <p className="mb-4 text-xs text-muted-foreground" aria-live="polite">
            {pathways.length} student{" "}
            {pathways.length === 1 ? "pathway" : "pathways"}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {pathways.map((pathway) => (
              <article
                key={pathway.profileId}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-semibold">
                      {pathway.anonymousLabel || "Student"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {pathway.intendedMajors.join(", ") || "Major not stated"}
                    </p>
                  </div>
                  <a
                    href={pathway.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Source <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {pathway.acceptedSchools.map((school) => {
                    const uni = matchUniversity(school);
                    return (
                      <span
                        key={school}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 py-0.5 pl-1 pr-2 text-[11px] font-medium text-primary"
                      >
                        {uni && <UniversityLogo university={uni} size={16} />}
                        {uni?.shortName ?? school}
                      </span>
                    );
                  })}
                </div>

                <ul className="space-y-3">
                  {pathway.activities.map((activity) => (
                    <li
                      key={activity.id}
                      className="rounded-xl bg-black/20 p-3"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {activity.title}
                        </span>
                        <SourceBadge activity={activity} />
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {activity.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {activity.stemField &&
                          activity.stemField !== "unknown" && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                              {activity.stemField}
                            </span>
                          )}
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                          {activity.experienceType}
                        </span>
                        {activity.termType !== "unknown" && (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                            {activity.termType.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {pathway.awards.length > 0 && (
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      STEM awards
                    </p>
                    <ul className="space-y-1">
                      {pathway.awards.map((award) => (
                        <li
                          key={award.id}
                          className="text-xs text-muted-foreground"
                        >
                          🏅 {award.name}
                          {award.year ? ` (${award.year})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
          {pathways.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No pathways match these filters yet. Try one of these:
              <span className="mt-3 flex justify-center gap-2">
                {[
                  "mit",
                  "stanford",
                  "uc-berkeley",
                  "harvard",
                  "georgia-tech",
                ].map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => filters.toggle("schools", id)}
                    aria-label={`Filter by ${id}`}
                    className="rounded-lg transition-transform hover:scale-110"
                  >
                    <UniversityLogo university={id} size={32} />
                  </button>
                ))}
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
