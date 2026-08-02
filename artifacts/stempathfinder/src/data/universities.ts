/**
 * Centralized university metadata for the Student Pathways feature.
 *
 * Logos are LOCAL assets only (public/university-logos/<id>.svg) — never
 * hotlinked at runtime. Official university marks are trademark-restricted, so
 * every current asset is a clean generated initials tile in the school's brand
 * color (see scripts/generate-university-logos). Dropping a licensed official
 * SVG over the same path upgrades a school with zero code changes.
 */

export type UniversityCategory =
  | "ivy_elite_private"
  | "top_private_stem"
  | "university_of_california"
  | "top_public_engineering";

export type University = {
  id: string;
  name: string;
  shortName: string;
  aliases: string[];
  category: UniversityCategory;
  logoPath: string;
  brandColor?: string;
};

export const UNIVERSITY_GROUPS: Record<UniversityCategory, string> = {
  ivy_elite_private: "Ivy & elite private",
  top_private_stem: "Top private STEM",
  university_of_california: "University of California",
  top_public_engineering: "Top public & engineering",
};

const u = (
  id: string,
  name: string,
  shortName: string,
  category: UniversityCategory,
  brandColor: string,
  aliases: string[] = [],
): University => ({
  id,
  name,
  shortName,
  category,
  brandColor,
  aliases,
  logoPath: `/university-logos/${id}.svg`,
});

export const UNIVERSITIES: University[] = [
  // Ivy & elite private
  u("harvard", "Harvard University", "Harvard", "ivy_elite_private", "#A51C30"),
  u("yale", "Yale University", "Yale", "ivy_elite_private", "#00356B"),
  u(
    "princeton",
    "Princeton University",
    "Princeton",
    "ivy_elite_private",
    "#E77500",
  ),
  u(
    "penn",
    "University of Pennsylvania",
    "Penn",
    "ivy_elite_private",
    "#011F5B",
    ["upenn", "pennsylvania"],
  ),
  u("cornell", "Cornell University", "Cornell", "ivy_elite_private", "#B31B1B"),
  u(
    "dartmouth",
    "Dartmouth College",
    "Dartmouth",
    "ivy_elite_private",
    "#00693E",
  ),
  u("brown", "Brown University", "Brown", "ivy_elite_private", "#4E3629"),
  u(
    "columbia",
    "Columbia University",
    "Columbia",
    "ivy_elite_private",
    "#1D4F91",
  ),
  u(
    "stanford",
    "Stanford University",
    "Stanford",
    "ivy_elite_private",
    "#8C1515",
  ),
  u(
    "uchicago",
    "University of Chicago",
    "UChicago",
    "ivy_elite_private",
    "#800000",
    ["chicago"],
  ),
  u("duke", "Duke University", "Duke", "ivy_elite_private", "#012169"),
  u(
    "northwestern",
    "Northwestern University",
    "Northwestern",
    "ivy_elite_private",
    "#4E2A84",
  ),
  u(
    "vanderbilt",
    "Vanderbilt University",
    "Vanderbilt",
    "ivy_elite_private",
    "#866D4B",
    ["vandy"],
  ),
  u(
    "washu",
    "Washington University in St. Louis",
    "WashU",
    "ivy_elite_private",
    "#A51417",
    ["washington university", "wustl"],
  ),
  u(
    "georgetown",
    "Georgetown University",
    "Georgetown",
    "ivy_elite_private",
    "#041E42",
  ),
  u(
    "notre-dame",
    "University of Notre Dame",
    "Notre Dame",
    "ivy_elite_private",
    "#0C2340",
    ["nd"],
  ),
  u("emory", "Emory University", "Emory", "ivy_elite_private", "#012169"),

  // Top private STEM
  u(
    "mit",
    "Massachusetts Institute of Technology",
    "MIT",
    "top_private_stem",
    "#A31F34",
    ["massachusetts institute of technology"],
  ),
  u(
    "caltech",
    "California Institute of Technology",
    "Caltech",
    "top_private_stem",
    "#FF6C0C",
    ["california institute of technology"],
  ),
  u(
    "carnegie-mellon",
    "Carnegie Mellon University",
    "Carnegie Mellon",
    "top_private_stem",
    "#C41230",
    ["cmu"],
  ),
  u(
    "johns-hopkins",
    "Johns Hopkins University",
    "Johns Hopkins",
    "top_private_stem",
    "#002D72",
    ["jhu", "hopkins"],
  ),
  u("rice", "Rice University", "Rice", "top_private_stem", "#00205B"),
  u("tufts", "Tufts University", "Tufts", "top_private_stem", "#3E8EDE"),
  u(
    "northeastern",
    "Northeastern University",
    "Northeastern",
    "top_private_stem",
    "#D41B2C",
  ),
  u("bu", "Boston University", "BU", "top_private_stem", "#CC0000", [
    "boston university",
  ]),
  u("bc", "Boston College", "BC", "top_private_stem", "#98002E", [
    "boston college",
  ]),
  u("nyu", "New York University", "NYU", "top_private_stem", "#57068C", [
    "new york university",
  ]),
  u(
    "usc",
    "University of Southern California",
    "USC",
    "top_private_stem",
    "#990000",
    ["southern california"],
  ),

  // University of California
  u(
    "uc-berkeley",
    "UC Berkeley",
    "Berkeley",
    "university_of_california",
    "#003262",
    ["berkeley", "university of california, berkeley", "cal"],
  ),
  u("ucla", "UCLA", "UCLA", "university_of_california", "#2774AE", [
    "university of california, los angeles",
  ]),
  u("ucsd", "UC San Diego", "UCSD", "university_of_california", "#182B49", [
    "uc san diego",
    "university of california, san diego",
  ]),
  u("uci", "UC Irvine", "UCI", "university_of_california", "#0064A4", [
    "uc irvine",
    "university of california, irvine",
    "irvine",
  ]),
  u("ucsb", "UC Santa Barbara", "UCSB", "university_of_california", "#003660", [
    "uc santa barbara",
    "university of california, santa barbara",
    "santa barbara",
  ]),
  u("uc-davis", "UC Davis", "UC Davis", "university_of_california", "#022851", [
    "davis",
    "university of california, davis",
  ]),

  // Top public & engineering
  u(
    "michigan",
    "University of Michigan",
    "Michigan",
    "top_public_engineering",
    "#00274C",
    ["umich", "ann arbor"],
  ),
  u(
    "georgia-tech",
    "Georgia Institute of Technology",
    "Georgia Tech",
    "top_public_engineering",
    "#003057",
    ["gatech", "georgia institute of technology"],
  ),
  u(
    "uiuc",
    "University of Illinois Urbana-Champaign",
    "UIUC",
    "top_public_engineering",
    "#13294B",
    ["illinois", "urbana", "urbana-champaign"],
  ),
  u(
    "uva",
    "University of Virginia",
    "UVA",
    "top_public_engineering",
    "#232D4B",
    ["virginia"],
  ),
  u(
    "purdue",
    "Purdue University",
    "Purdue",
    "top_public_engineering",
    "#6F5426",
  ),
  u(
    "uw-madison",
    "University of Wisconsin–Madison",
    "UW-Madison",
    "top_public_engineering",
    "#C5050C",
    ["wisconsin", "madison", "wisconsin-madison"],
  ),
  u(
    "uga",
    "University of Georgia",
    "UGA",
    "top_public_engineering",
    "#BA0C2F",
    ["university of georgia"],
  ),
  u("uf", "University of Florida", "UF", "top_public_engineering", "#0021A5", [
    "florida",
    "university of florida",
  ]),
  u(
    "ohio-state",
    "Ohio State University",
    "Ohio State",
    "top_public_engineering",
    "#BB0000",
    ["osu", "the ohio state university"],
  ),
  u(
    "uw",
    "University of Washington",
    "UW",
    "top_public_engineering",
    "#4B2E83",
    ["udub", "university of washington"],
  ),
  u(
    "ut-austin",
    "UT Austin",
    "UT Austin",
    "top_public_engineering",
    "#BF5700",
    ["university of texas", "texas", "ut", "university of texas at austin"],
  ),
  u("unc", "UNC Chapel Hill", "UNC", "top_public_engineering", "#13294B", [
    "north carolina",
    "chapel hill",
    "unc chapel hill",
  ]),
  u(
    "umd",
    "University of Maryland",
    "UMD",
    "top_public_engineering",
    "#E21833",
    ["maryland", "college park"],
  ),
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const byId = new Map(UNIVERSITIES.map((uni) => [uni.id, uni]));

export function getUniversity(id: string): University | undefined {
  return byId.get(id);
}

/**
 * Normalization helper: maps a free-text school name (imported EC Database
 * value, filter label, or alias) to its university metadata. Imported data is
 * never rewritten — normalization happens here, at the presentation layer.
 */
export function matchUniversity(schoolText: string): University | undefined {
  const text = normalize(schoolText);
  if (!text) return undefined;
  for (const uni of UNIVERSITIES) {
    const candidates = [
      uni.id.replace(/-/g, " "),
      uni.name,
      uni.shortName,
      ...uni.aliases,
    ].map(normalize);
    if (candidates.some((c) => c === text)) return uni;
  }
  // Fall back to containment (e.g. "Stanford University (REA)").
  for (const uni of UNIVERSITIES) {
    const candidates = [uni.name, uni.shortName, ...uni.aliases].map(normalize);
    if (
      candidates.some(
        (c) => c.length >= 3 && (text.includes(c) || c.includes(text)),
      )
    ) {
      return uni;
    }
  }
  return undefined;
}

/** Deterministic initials for the fallback tile. */
export function universityInitials(uni: University): string {
  if (
    uni.shortName.length <= 4 &&
    uni.shortName === uni.shortName.toUpperCase()
  ) {
    return uni.shortName;
  }
  const words = uni.shortName.split(/[\s-]+/).filter(Boolean);
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
