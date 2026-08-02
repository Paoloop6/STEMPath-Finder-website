export interface LiveStats {
  opportunityCount: number;
  websiteCount: number;
  lastUpdated: string | null;
}

/** Full server-computed statistics from the DynamoDB opportunity repository. */
export interface OpportunityStats {
  source: string;
  table: string;
  totalActive: number;
  pendingReview: number;
  published: number;
  expired: number;
  byType: Record<string, number>;
  byStemField: Record<string, number>;
  byLocation: Record<string, number>;
  remote: { remote: number; inPerson: number; hybrid: number; unknown: number };
  deadlines: { next7Days: number; next30Days: number; next60Days: number };
  cost: Record<string, number>;
  organizations: number;
  websiteCount: number;
  latestRunId: string | null;
  lastUpdated: string | null;
  addedInLatestRun: number;
}

export async function fetchOpportunityStats(
  refresh = false,
): Promise<OpportunityStats> {
  const response = await fetch(
    `/api/opportunity-stats${refresh ? "?refresh=true" : ""}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load live stats (${response.status}).`);
  }
  return (await response.json()) as OpportunityStats;
}

export async function fetchLiveStats(): Promise<LiveStats> {
  const stats = await fetchOpportunityStats();
  return {
    // "Researched opportunities" = everything ever collected (active +
    // expired). The /database page separately shows only what's active.
    opportunityCount: stats.totalActive + stats.expired,
    websiteCount: stats.websiteCount,
    lastUpdated: stats.lastUpdated,
  };
}

export function formatLastUpdated(value: string | null): string {
  if (!value) return "Not yet verified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet verified";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
