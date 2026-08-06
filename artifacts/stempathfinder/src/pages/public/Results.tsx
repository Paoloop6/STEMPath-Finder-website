import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { MatchResult } from "@workspace/api-client-react";
import { Seo } from "@/components/Seo";
import { opportunityPath } from "@/lib/seo";

export default function Results() {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [filter, setFilter] = useState<"all" | "eligible">("all");

  useEffect(() => {
    const state = history.state;
    if (!state?.results) {
      setLocation("/match");
      return;
    }
    setResults(state.results);
  }, [setLocation]);

  if (!results.length) return null;

  const displayed =
    filter === "eligible"
      ? results.filter((r) => r.eligibilityLabel === "Eligible" || r.eligibilityLabel === "Maybe Eligible")
      : results;

  return (
    <MainLayout>
      {/* Session-specific results — never indexable. */}
      <Seo title="Your Match Results" robots="noindex, follow" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Link href="/match" className="text-sm text-muted-foreground hover:text-foreground mb-3 inline-block">
              ← Back to form
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              {results.length} match{results.length !== 1 ? "es" : ""}
            </h1>
          </div>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded border transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("eligible")}
              className={`px-3 py-1.5 rounded border transition-colors ${
                filter === "eligible"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Eligible only
            </button>
          </div>
        </div>

        {displayed.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8">
            No eligible matches found.{" "}
            <button onClick={() => setFilter("all")} className="text-primary underline-offset-4 hover:underline">
              Show all
            </button>
          </p>
        ) : (
          <div className="divide-y divide-border border border-border rounded-md">
            {displayed.map((result, idx) => (
              <ResultRow key={result.opportunity.id} result={result} rank={idx + 1} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

function ResultRow({ result, rank }: { result: MatchResult; rank: number }) {
  const { opportunity, score, eligibilityLabel, deadlineLabel, aiReason, aiCaution } = result;

  const eligibilityColor =
    eligibilityLabel === "Eligible"
      ? "text-green-700"
      : eligibilityLabel === "Maybe Eligible"
      ? "text-amber-700"
      : eligibilityLabel === "Not Eligible"
      ? "text-red-600"
      : "text-muted-foreground";

  const deadlineUrgent = deadlineLabel === "Apply Now" || deadlineLabel === "Closing Soon";

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 transition-colors">
      <div className="w-6 text-sm text-muted-foreground tabular-nums flex-shrink-0 text-right">
        {rank}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground truncate">{opportunity.name}</div>
        <div className="text-sm text-muted-foreground">
          {opportunity.organization} · Grades {opportunity.eligibleGrades} · {opportunity.category}
        </div>
        {/* Present only when the search-depth pass ran and succeeded. */}
        {aiReason && <p className="mt-1 text-sm text-foreground/80">{aiReason}</p>}
        {aiCaution && <p className="mt-0.5 text-sm text-amber-700">Heads up: {aiCaution}</p>}
      </div>

      <div className="hidden sm:flex flex-col items-end flex-shrink-0 text-sm gap-0.5">
        <span className={`font-medium ${eligibilityColor}`}>{eligibilityLabel}</span>
        <span className={deadlineUrgent ? "text-amber-700" : "text-muted-foreground"}>
          {deadlineLabel}
        </span>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="text-lg font-semibold tabular-nums text-primary">{score}</div>
        <div className="text-xs text-muted-foreground">/100</div>
      </div>

      <Link
        // Canonical slug path — a bare-id URL has no prerendered file and now 404s.
        href={opportunityPath(opportunity.name, opportunity.id)}
        className="flex-shrink-0 text-sm text-primary underline-offset-4 hover:underline"
      >
        View
      </Link>
    </div>
  );
}
