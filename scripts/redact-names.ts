// Shared student-name redaction rules, used by both the importer and the
// anonymization migration so new imports and backfills behave identically.
//
// Never redacts organization/university/program/competition names: full-name
// matches are always safe, and single name parts are skipped when they equal a
// protected word (Brown, Rice, Duke, …) so "Brown University" survives even
// for a student surnamed Brown.

export const REDACTION = "the student";

const PROTECTED_WORDS = new Set([
  "brown", "rice", "duke", "penn", "yale", "harvard", "princeton", "cornell",
  "dartmouth", "columbia", "stanford", "berkeley", "emory", "tufts",
  "georgetown", "vanderbilt", "northwestern", "hopkins", "johns", "carnegie",
  "mellon", "notre", "dame", "washington", "virginia", "michigan", "georgia",
  "florida", "texas", "wisconsin", "maryland", "illinois", "ohio", "boston",
  "york", "chicago", "california", "college", "university", "institute",
  "school", "academy", "club", "society", "olympiad", "science", "national",
]);

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build redaction regexes for one student's name. */
export function buildNamePatterns(fullName: string | null | undefined): RegExp[] {
  const cleaned = (fullName ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) return [];
  const patterns: RegExp[] = [
    // The full name is always redacted, case-insensitive.
    new RegExp(`\\b${escapeRegExp(cleaned)}\\b`, "gi"),
  ];
  // First name alone (the common "Adam founded…" pattern). Capitalized,
  // whole-word, and never a protected institution word. Surnames alone are
  // deliberately NOT redacted — too much collision risk with organizations.
  const first = cleaned.split(" ")[0]!;
  if (first.length >= 3 && !PROTECTED_WORDS.has(first.toLowerCase())) {
    patterns.push(
      new RegExp(
        `\\b${first[0]!.toUpperCase()}${escapeRegExp(first.slice(1))}\\b`,
        "g",
      ),
    );
  }
  return patterns;
}

export function redactText(
  value: unknown,
  patterns: RegExp[],
): { text: unknown; changed: boolean } {
  if (typeof value !== "string" || value.length === 0) {
    return { text: value, changed: false };
  }
  let out = value;
  for (const pattern of patterns) {
    out = out.replace(pattern, REDACTION);
  }
  // Collapse artifacts like "the student the student".
  out = out.replace(new RegExp(`(${REDACTION}\\s+)+${REDACTION}`, "g"), REDACTION);
  return { text: out, changed: out !== value };
}

/** Fields on activity/award records that may contain a student's name. */
export const REDACTABLE_FIELDS = [
  "title",
  "description",
  "organization",
  "role",
  "name",
] as const;

/** Redact every redactable field of a record in place; returns true if changed. */
export function redactRecord(
  record: Record<string, unknown>,
  patterns: RegExp[],
): boolean {
  let changed = false;
  for (const field of REDACTABLE_FIELDS) {
    const result = redactText(record[field], patterns);
    if (result.changed) {
      record[field] = result.text;
      changed = true;
    }
  }
  return changed;
}
