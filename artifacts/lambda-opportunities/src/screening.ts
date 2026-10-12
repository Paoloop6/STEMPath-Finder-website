// Cheap first-stage screening.
//
// Deciding whether a page deserves the expensive extraction model must not
// itself be expensive, so this stage looks only at signals we already hold after
// mapping: the URL, title, meta/Open Graph description, headings and a short
// text sample. No model call happens here.
//
// Two decisions come out of it, and they are deliberately independent:
//
//   extractionWorthy — send this page to the extraction model
//   keepCrawling     — keep following this page's links
//
// A page can be worth crawling without being worth extracting. A department
// index listing forty programs holds no opportunity itself but is the single
// most valuable page on the site to traverse. Conflating the two is what makes
// crawlers shallow, so PART 9 requires them to stay separate.

export type PageRole =
  | "opportunity" // looks like a single program/opportunity page
  | "directory" // lists many programs
  | "eligibility"
  | "deadline"
  | "cost"
  | "faq"
  | "application"
  | "supporting" // related to a program but none of the above
  | "unrelated";

export type ScreeningResult = {
  role: PageRole;
  score: number;
  extractionWorthy: boolean;
  /** Always true unless the page is structurally useless (login, cart, media). */
  keepCrawling: boolean;
  signals: string[];
};

export type PageSample = {
  url: string;
  title: string;
  description: string;
  headings: string[];
  /** A short slice of body text. Never the whole page. */
  textSample: string;
};

const ROLE_PATTERNS: Array<{ role: PageRole; pattern: RegExp; weight: number }> = [
  { role: "application", pattern: /\b(how to apply|apply now|application form|submit your application|start your application)\b/i, weight: 5 },
  { role: "eligibility", pattern: /\b(eligibility|who (?:can|may) apply|requirements|must be a|qualif\w+)\b/i, weight: 5 },
  { role: "deadline", pattern: /\b(deadline|applications? (?:open|close)|important dates|key dates|apply by)\b/i, weight: 5 },
  { role: "cost", pattern: /\b(tuition|program (?:cost|fee)|cost of attendance|fees?|financial aid|stipend|scholarship)\b/i, weight: 4 },
  { role: "faq", pattern: /\b(frequently asked questions|faq)\b/i, weight: 4 },
  { role: "directory", pattern: /\b(programs?|opportunit\w+|our offerings|browse|explore (?:our )?programs|list of)\b/i, weight: 3 },
  { role: "opportunity", pattern: /\b(summer program|internship|research experience|fellowship|academy|institute|camp|workshop|competition|mentorship)\b/i, weight: 5 },
];

/**
 * Tiebreak order when several roles match equally strongly.
 *
 * A program landing page normally also talks about eligibility, dates and cost,
 * so those roles must not outrank "opportunity" on an equal score. A dedicated
 * supporting page still wins because its role matches in the URL path, which
 * scores higher than a body match.
 */
const ROLE_PRECEDENCE: PageRole[] = [
  "opportunity",
  "directory",
  "application",
  "deadline",
  "eligibility",
  "cost",
  "faq",
  "supporting",
  "unrelated",
];

/** Signals that the page concerns pre-college students specifically. */
const AUDIENCE_PATTERN =
  /\b(high[- ]school|highschool|grades? ?9|grades? ?1[0-2]|teen\w*|youth|pre-?college|secondary school|rising (?:senior|junior|sophomore)|k-?12)\b/i;

const STEM_PATTERN =
  /\b(stem|science|engineering|technolog\w+|math\w*|robotics|computer science|coding|programming|biolog\w+|chemistr\w+|physics|medicine|medical|health|neuroscience|astronom\w+|environment\w+|data science|artificial intelligence|machine learning)\b/i;

/** Paths that cannot contain useful content and are not worth traversing. */
const DEAD_END_PATH =
  /\/(login|signin|sign-in|register-account|account|cart|checkout|privacy|terms|cookie|accessibility|sitemap\.xml|feed|rss|wp-admin|wp-json)\b/i;

/**
 * Editorial paths. A news story about a summer program matches every keyword a
 * real program page does, but it is an article, not an opportunity. These are
 * still crawled (they link to the real program page); they just do not earn a
 * model call on their own.
 */
const EDITORIAL_PATH = /\/(news|blog|press|stories|articles?|magazine|newsroom|archive)(\/|$)/i;

const BINARY_EXTENSION =
  /\.(jpe?g|png|gif|svg|webp|avif|ico|css|js|mp4|mp3|zip|gz|dmg|exe|woff2?|ttf|eot)(\?|$)/i;

/**
 * Screen a mapped page.
 *
 * `extractionWorthy` requires both a recognisable program-ish role and some
 * evidence the page is about students or STEM, because sending every page on a
 * university site to the model is exactly the cost we are trying to avoid.
 */
export function screenPage(sample: PageSample): ScreeningResult {
  const haystack = [
    sample.title,
    sample.description,
    sample.headings.join(" "),
    sample.textSample,
  ]
    .join(" ")
    .slice(0, 6000);

  const path = safePath(sample.url);
  const signals: string[] = [];

  if (BINARY_EXTENSION.test(path)) {
    return { role: "unrelated", score: 0, extractionWorthy: false, keepCrawling: false, signals: ["binary"] };
  }
  if (DEAD_END_PATH.test(path)) {
    return { role: "unrelated", score: 0, extractionWorthy: false, keepCrawling: false, signals: ["dead-end"] };
  }

  const earnedByRole = new Map<PageRole, number>();
  let score = 0;
  for (const { role, pattern, weight } of ROLE_PATTERNS) {
    const inPath = pattern.test(path);
    const inBody = pattern.test(haystack);
    if (!inPath && !inBody) continue;
    // A match in the URL path is far stronger evidence of what a page *is*
    // than a match in the body, where supporting keywords appear as section
    // headings on almost every program landing page.
    const earned = weight + (inPath ? 4 : 0);
    score += earned;
    signals.push(role);
    earnedByRole.set(role, Math.max(earnedByRole.get(role) ?? 0, earned));
  }

  let best: { role: PageRole; weight: number } = { role: "supporting", weight: 0 };
  for (const [role, earned] of earnedByRole) {
    if (
      earned > best.weight ||
      (earned === best.weight && ROLE_PRECEDENCE.indexOf(role) < ROLE_PRECEDENCE.indexOf(best.role))
    ) {
      best = { role, weight: earned };
    }
  }

  const audience = AUDIENCE_PATTERN.test(haystack) || AUDIENCE_PATTERN.test(path);
  const stem = STEM_PATTERN.test(haystack) || STEM_PATTERN.test(path);
  if (audience) {
    score += 4;
    signals.push("audience");
  }
  if (stem) {
    score += 3;
    signals.push("stem");
  }

  const role: PageRole = score === 0 ? "unrelated" : best.role;

  // Only pages that read like a program AND mention the right audience or
  // subject earn a model call. Supporting-role pages (eligibility, deadline,
  // cost, FAQ, application) are gathered by the aggregator against a parent
  // opportunity rather than extracted on their own.
  const editorial = EDITORIAL_PATH.test(path);
  if (editorial) signals.push("editorial");

  const programLike = role === "opportunity" || role === "directory";
  const extractionWorthy = programLike && (audience || stem) && score >= 8 && !editorial;

  return {
    role,
    score,
    extractionWorthy,
    // Traversal continues almost everywhere on purpose. A page failing
    // screening still contributes its links.
    keepCrawling: true,
    signals,
  };
}

/** Supporting roles whose content is merged into a parent opportunity record. */
export const SUPPORTING_ROLES: ReadonlySet<PageRole> = new Set<PageRole>([
  "eligibility",
  "deadline",
  "cost",
  "faq",
  "application",
]);

export function isSupportingRole(role: PageRole): boolean {
  return SUPPORTING_ROLES.has(role);
}

function safePath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
