import { Link } from "wouter";
import { MainLayout } from "@/components/layout/MainLayout";
import { useListOpportunities } from "@workspace/api-client-react";

function Home() {
  const { data: opportunities, isLoading } = useListOpportunities({ search: "" });

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Find STEM opportunities for students
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl">
            Competitions, summer programs, internships, and scholarships for grades 6–12.
            Answer a few questions and we'll rank the best fits for you.
          </p>
          <div className="flex gap-3">
            <Link
              href="/match"
              className="inline-block px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Find opportunities
            </Link>
          </div>
        </div>

        {/* Opportunity list */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            All opportunities
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded-md animate-pulse" />
              ))}
            </div>
          ) : opportunities && opportunities.length > 0 ? (
            <div className="divide-y divide-border border border-border rounded-md">
              {opportunities.map((opp) => (
                <Link
                  key={opp.id}
                  href={`/opportunities/${opp.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {opp.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {opp.organization} · {opp.category} · Grades {opp.eligibleGrades}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-sm text-muted-foreground">
                    {opp.deadline
                      ? new Date(opp.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : opp.format}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-8">
              No opportunities yet. Add them through the{' '}
              <Link href="/admin" className="text-primary underline-offset-4 hover:underline">
                admin panel
              </Link>.
            </p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default Home;
