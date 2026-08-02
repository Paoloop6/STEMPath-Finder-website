import { useQuery } from '@tanstack/react-query';
import { fetchLiveStats, formatLastUpdated } from '@/lib/live-stats';

function StatSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="skeleton-shimmer h-7 w-14 rounded-md bg-white/10" />
      <div className="skeleton-shimmer h-3 w-24 rounded-md bg-white/10" />
    </div>
  );
}

export function LiveStats() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['live-stats'],
    queryFn: fetchLiveStats,
    staleTime: 5 * 60 * 1000,
  });

  if (isError) return null;

  return (
    <div className="flex w-full flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-card px-5 py-4 sm:flex-row sm:items-center sm:gap-0 sm:divide-x sm:divide-border">
      <div className="flex-1 sm:pr-5">
        {isLoading || !data ? (
          <StatSkeleton />
        ) : (
          <>
            <p className="font-display text-[26px] font-semibold tabular-nums leading-none text-foreground">
              {data.opportunityCount.toLocaleString()}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">Researched opportunities</p>
          </>
        )}
      </div>

      <div className="flex-1 sm:px-5">
        {isLoading || !data ? (
          <StatSkeleton />
        ) : (
          <>
            <p className="font-display text-[26px] font-semibold tabular-nums leading-none text-foreground">
              {data.websiteCount.toLocaleString()}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">Websites found</p>
          </>
        )}
      </div>

      <div className="flex-1 sm:pl-5">
        {isLoading || !data ? (
          <StatSkeleton />
        ) : (
          <>
            <p className="font-display text-[26px] font-semibold leading-none text-foreground">
              {formatLastUpdated(data.lastUpdated)}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">Last updated</p>
          </>
        )}
      </div>
    </div>
  );
}
