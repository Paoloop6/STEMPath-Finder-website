/**
 * Search depth — the student-facing choice of how hard the AI works on a match run.
 *
 * Only the tier name crosses the wire. Model ids stay server-side (the
 * ask-stempath edge function and the api-server both keep their own copy of the
 * mapping), so re-pointing a tier at a different model never needs a client
 * release. Standard is the default: most searches do not need Pro's reasoning
 * budget, and it keeps the common path fast and cheap.
 */

export const SEARCH_TIERS = ["standard", "pro"] as const;

export type SearchTier = (typeof SEARCH_TIERS)[number];

export const DEFAULT_SEARCH_TIER: SearchTier = "standard";

export const SEARCH_TIER_LABELS: Record<SearchTier, string> = {
  standard: "Standard",
  pro: "Pro",
};

/** Shown under the selector so the tradeoff is legible before a student commits. */
export const SEARCH_TIER_HINTS: Record<SearchTier, string> = {
  standard: "Fast. Good for most searches.",
  pro: "Reads each opportunity more carefully. Slower.",
};

export function isSearchTier(value: unknown): value is SearchTier {
  return (
    typeof value === "string" &&
    (SEARCH_TIERS as readonly string[]).includes(value)
  );
}
