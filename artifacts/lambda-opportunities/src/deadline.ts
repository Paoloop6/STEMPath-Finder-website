// Deadline interpretation for discovery candidates.
//
// Replaces the previous `Date.parse(deadline) < now - 1 day` test, which threw
// away roughly half of everything the extractor produced. Two faults drove that:
//
//   1. Annually recurring programs whose landing page still shows the previous
//      cycle's date were rejected even when the page said applications were
//      open. Project ENGAGES, RNS NeuroCamp and the S&S Pierson Foundation
//      scholarship were all discarded this way on 2026-08-08.
//   2. Date.parse("July 5") resolves to 2001-07-05, so any year-less deadline
//      was read as two decades expired.
//
// The rule here is deliberately conservative in the other direction: a record is
// only rejected when the page itself gives us real evidence the opportunity is
// finished. Anything ambiguous is kept and marked, because these records land in
// the pending review queue rather than going live.

/** How a deadline string was understood. */
export type DeadlineKind =
  | "absolute" // explicit calendar date including a year
  | "recurring" // a month/day with no year, e.g. "July 5"
  | "rolling" // "rolling", "open until filled", "varies"
  | "none"; // nothing usable

export type ParsedDeadline = {
  kind: DeadlineKind;
  /** Epoch ms. Only meaningful when kind === "absolute". */
  timestamp: number | null;
  raw: string | null;
};

const ROLLING_PATTERNS =
  /\b(rolling|until filled|ongoing|continuous|varies|year[- ]round|no deadline|open enrollment|tba|to be announced|check website)\b/i;

/** A four-digit year between 1900 and 2999 appearing as its own token. */
const EXPLICIT_YEAR = /(?:^|[^\d])((?:19|20|21)\d{2})(?:[^\d]|$)/;

/**
 * Parse a deadline string without Date.parse's year-defaulting behaviour.
 * A date is only treated as absolute when the source text actually names a year.
 */
export function parseDeadline(raw: unknown): ParsedDeadline {
  if (typeof raw !== "string") return { kind: "none", timestamp: null, raw: null };
  const text = raw.trim();
  if (!text) return { kind: "none", timestamp: null, raw: null };

  if (ROLLING_PATTERNS.test(text)) {
    return { kind: "rolling", timestamp: null, raw: text };
  }

  const hasYear = EXPLICIT_YEAR.test(text);
  const parsed = Date.parse(text);

  if (Number.isNaN(parsed)) return { kind: "none", timestamp: null, raw: text };
  if (!hasYear) {
    // "July 5", "March 31" — a real recurring cycle date, but we cannot know
    // which year it refers to, so it must never be compared against now.
    return { kind: "recurring", timestamp: null, raw: text };
  }
  return { kind: "absolute", timestamp: parsed, raw: text };
}

/** Does the page say applications are currently open (or reopening)? */
export function statusSuggestsOpen(status: unknown): boolean {
  if (typeof status !== "string") return false;
  const s = status.toLowerCase();
  if (/\b(closed|ended|expired|no longer|not accepting|cancell?ed)\b/.test(s)) return false;
  return /\b(open|opens|opening|accepting|now accepting|available|apply|rolling|upcoming|coming soon)\b/.test(s);
}

/** Does the page explicitly say the opportunity is closed? */
export function statusSuggestsClosed(status: unknown): boolean {
  if (typeof status !== "string") return false;
  return /\b(closed|ended|expired|no longer accepting|not accepting|cancell?ed)\b/i.test(status);
}

export type DeadlineVerdict = {
  /** Drop the candidate entirely. */
  reject: boolean;
  /** Machine-readable reason, recorded on the stored record for reviewers. */
  reason:
    | "future"
    | "rolling"
    | "unknown"
    | "recurring_cycle"
    | "stale_but_open"
    | "long_abandoned"
    | "explicitly_closed";
  /** Stored so a human reviewer can see why a past date was kept. */
  staleDeadline: boolean;
};

/**
 * Roughly 18 months. A year-bearing deadline older than this, on a page nobody
 * has refreshed, is treated as an abandoned listing rather than a live annual
 * program.
 */
export const LONG_ABANDONED_DAYS = 550;

const DAY_MS = 86_400_000;

/**
 * Decide whether a candidate should be dropped for being out of date.
 *
 * Rejects only on real evidence:
 *   - the page explicitly says closed AND its dated deadline has passed, or
 *   - the dated deadline is more than ~18 months old.
 *
 * Everything else is kept. A past deadline on a page still advertising an open
 * or unstated application is the normal appearance of an annually recurring
 * program between cycles, and is flagged rather than discarded.
 */
export function judgeDeadline(
  deadlineRaw: unknown,
  statusRaw: unknown,
  now: number,
): DeadlineVerdict {
  const parsed = parseDeadline(deadlineRaw);

  if (parsed.kind === "rolling") {
    return { reject: false, reason: "rolling", staleDeadline: false };
  }
  if (parsed.kind === "none") {
    return { reject: false, reason: "unknown", staleDeadline: false };
  }
  if (parsed.kind === "recurring") {
    // Month/day with no year. Never comparable to now.
    return { reject: false, reason: "recurring_cycle", staleDeadline: false };
  }

  const timestamp = parsed.timestamp!;
  // One day of slack so a deadline landing today is still treated as live.
  if (timestamp >= now - DAY_MS) {
    return { reject: false, reason: "future", staleDeadline: false };
  }

  const ageDays = (now - timestamp) / DAY_MS;
  if (ageDays > LONG_ABANDONED_DAYS) {
    return { reject: true, reason: "long_abandoned", staleDeadline: true };
  }
  if (statusSuggestsClosed(statusRaw)) {
    return { reject: true, reason: "explicitly_closed", staleDeadline: true };
  }
  // Past date, page does not say closed: an annual program between cycles.
  return { reject: false, reason: "stale_but_open", staleDeadline: true };
}
