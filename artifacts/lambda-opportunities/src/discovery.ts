// Discovery optimization: URL canonicalization, similarity normalization,
// rotating query groups, and novelty scoring for stempath-daily-opportunities.
//
// Everything here is deterministic — no model calls. DeepSeek only ever sees
// URLs that survive classification.

// ---------------------------------------------------------------------------
// URL canonicalization
// ---------------------------------------------------------------------------

const TRACKING_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "ref", "source",
]);

/**
 * Canonical form used for deduplication and stable PKs: lowercase host,
 * no fragment, no tracking params, no trailing slash, no www. Meaningful
 * query params are preserved; redirects are never fetched.
 */
export function canonicalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const param of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(param.toLowerCase())) url.searchParams.delete(param);
    }
    url.searchParams.sort();
    let out = url.toString();
    if (out.endsWith("/")) out = out.slice(0, -1);
    return out;
  } catch {
    return null;
  }
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Title + organization similarity
// ---------------------------------------------------------------------------

const TITLE_STOPWORDS = new Set([
  "application", "applications", "open", "now", "apply", "program", "page",
  "official", "site", "website", "summer", "the", "a", "an", "for", "and",
  "of", "at", "in", "to", "high", "school", "students", "student",
]);

const UNIVERSITY_ABBREVIATIONS: Record<string, string> = {
  "massachusetts institute of technology": "mit",
  "university of texas": "ut",
  "university of texas at austin": "ut",
  "texas a&m university": "tamu",
  "texas a&m": "tamu",
  "university of houston": "uh",
  "rice university": "rice",
  "johns hopkins university": "jhu",
  "carnegie mellon university": "cmu",
};

/** Normalized "title|organization" fingerprint for near-duplicate detection. */
export function normalizeTitleOrg(title: unknown, organization: unknown): string {
  const clean = (value: unknown): string => {
    let text = String(value ?? "").toLowerCase();
    for (const [long, short] of Object.entries(UNIVERSITY_ABBREVIATIONS)) {
      text = text.replaceAll(long, short);
    }
    return text
      .replace(/20\d\d/g, "") // year labels
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((token) => token && !TITLE_STOPWORDS.has(token))
      .sort()
      .join(" ");
  };
  return `${clean(title)}|${clean(organization)}`;
}

/** Token-overlap Jaccard similarity between two normalized fingerprints. */
export function fingerprintSimilarity(a: string, b: string): number {
  const ta = new Set(a.replace("|", " ").split(" ").filter(Boolean));
  const tb = new Set(b.replace("|", " ").split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const token of ta) if (tb.has(token)) shared += 1;
  return shared / (ta.size + tb.size - shared);
}

export const SIMILARITY_THRESHOLD = 0.8;

// ---------------------------------------------------------------------------
// Low-value domains (recurring listicles / SEO directories / aggregators)
// ---------------------------------------------------------------------------

export const LOW_VALUE_DOMAINS = new Set([
  "scholarships360.org", "scholarships.com", "fastweb.com", "niche.com",
  "collegevine.com", "teenlife.com", "bold.org", "unigo.com", "cappex.com",
  "collegexpress.com", "medium.com", "prepscholar.com", "blog.collegevine.com",
  "polygence.org", "crimsoneducation.org", "indeed.com", "ziprecruiter.com",
  "wayup.com", "chegg.com", "coursera.org", "reddit.com", "quora.com",
]);

export function isOfficialDomain(domain: string): boolean {
  return (
    domain.endsWith(".edu") ||
    domain.endsWith(".gov") ||
    domain.endsWith(".org")
  );
}

// ---------------------------------------------------------------------------
// Rotating query groups
// ---------------------------------------------------------------------------

export const QUERY_GROUPS: Record<string, string[]> = {
  "A-houston-texas": [
    "Houston STEM internships high school",
    "Texas high school research programs",
    "Houston medical volunteering teenagers",
    "Texas robotics programs grades 8 12",
    "Houston university outreach STEM students",
  ],
  "B-national-research": [
    "high school summer research program science",
    "high school engineering internship",
    "high school AI machine learning program",
    "high school biology chemistry research",
    "high school neuroscience internship",
  ],
  "C-competitions": [
    "high school robotics competition",
    "high school coding competition",
    "science fair research competition",
    "math competition high school registration",
    "engineering design challenge students",
  ],
  "D-medicine-health": [
    "high school clinical research program",
    "premed summer program high school",
    "hospital volunteer high school students",
    "public health program teenagers",
    "biomedical research high school",
  ],
  "E-university-outreach": [
    "site:.edu high school STEM summer program",
    "site:.edu high school research application",
    "site:.edu engineering outreach high school",
    "site:.edu computer science summer high school",
    "site:.edu medical program high school",
  ],
  "F-scholarships": [
    "STEM scholarship high school students",
    "science scholarship grades 9 12",
    "engineering scholarship high school",
    "robotics grant students",
    "research scholarship teenagers",
  ],
};

const QUERY_VARIATIONS = [
  (year: number) => `${year}`,
  (year: number) => `summer ${year + (new Date().getMonth() >= 5 ? 1 : 0)}`,
  () => "application open",
  () => "applications now open",
  () => "deadline",
  () => "grades 8-12",
  () => "high school students",
  () => "remote",
  () => "Houston",
  () => "Texas",
  () => "national",
];

/** Pick 3 of the 6 groups for the given day and vary each query's phrasing. */
export function queriesForDay(dayIndex: number): Array<{ group: string; query: string }> {
  const groupNames = Object.keys(QUERY_GROUPS);
  const year = new Date().getFullYear();
  const selected = [0, 2, 4].map((offset) => groupNames[(dayIndex + offset) % groupNames.length]!);
  const queries: Array<{ group: string; query: string }> = [];
  for (const group of selected) {
    for (const [queryIndex, base] of QUERY_GROUPS[group]!.entries()) {
      const variation = QUERY_VARIATIONS[(dayIndex + queryIndex) % QUERY_VARIATIONS.length]!(year);
      queries.push({ group, query: `${base} ${variation}` });
    }
  }
  return queries;
}

// ---------------------------------------------------------------------------
// Novelty scoring
// ---------------------------------------------------------------------------

export type NoveltyInputs = {
  isNewCanonicalUrl: boolean;
  isNewOrganization: boolean;
  isNewDomain: boolean;
  publishedRecently: boolean;
  applicationOpen: boolean;
  gradeRelevant: boolean;
  texasRelevant: boolean;
  officialSource: boolean;
  duplicateTitleSimilarity: number; // 0..1 vs closest existing record
  recentlyChecked: boolean;
  lowValueDomain: boolean;
  expiredOrNoDeadline: boolean;
};

export function noveltyScore(input: NoveltyInputs): number {
  let score = 0;
  if (input.isNewCanonicalUrl) score += 3;
  if (input.isNewOrganization) score += 2;
  if (input.isNewDomain) score += 2;
  if (input.publishedRecently) score += 1;
  if (input.applicationOpen) score += 1;
  if (input.gradeRelevant) score += 1;
  if (input.texasRelevant) score += 1;
  if (input.officialSource) score += 2;
  score -= Math.round(input.duplicateTitleSimilarity * 3);
  if (input.recentlyChecked) score -= 3;
  if (input.lowValueDomain) score -= 5;
  if (input.expiredOrNoDeadline) score -= 1;
  return score;
}
