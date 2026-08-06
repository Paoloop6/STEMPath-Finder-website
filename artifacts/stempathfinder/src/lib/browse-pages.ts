/**
 * Config for the indexable browse pages: categories, locations, and grades.
 * Each entry becomes a real route with its own title, description, H1,
 * intro copy, matching listings, and related-page links — the crawlable
 * alternative to query-string filters on /database.
 */

import { gradeLabel, type DatabaseRecord } from "@/lib/database-records";

export interface BrowsePage {
  /** Route path, also the canonical URL. */
  path: string;
  /** Meta/OG title (site name appended automatically). */
  title: string;
  h1: string;
  description: string;
  intro: string[];
  group: "category" | "location" | "grade";
  filter: (record: DatabaseRecord) => boolean;
  /** Paths of related browse pages to cross-link. */
  related: string[];
}

/** Case-insensitive match across the fields students search by. */
function textOf(record: DatabaseRecord): string {
  return [
    record.title,
    record.organization,
    record.opportunity_type,
    record.good_for,
    ...(Array.isArray(record.stem_fields) ? record.stem_fields : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matches(record: DatabaseRecord, pattern: RegExp): boolean {
  return pattern.test(textOf(record));
}

function typeIs(record: DatabaseRecord, pattern: RegExp): boolean {
  return pattern.test((record.opportunity_type ?? "").toLowerCase());
}

function locationHas(record: DatabaseRecord, pattern: RegExp): boolean {
  return pattern.test((record.location ?? "").toLowerCase());
}

function gradeIncludes(record: DatabaseRecord, grade: number): boolean {
  const label = gradeLabel(record.eligible_grades);
  if (!label) return false;
  return new RegExp(`(^|\\D)${grade}(\\D|$)`).test(label);
}

const isInternship = (r: DatabaseRecord) =>
  typeIs(r, /internship/) || matches(r, /\bintern(ship)?s?\b/);

const isFree = (r: DatabaseRecord) => {
  const cost = (r.cost ?? "").toLowerCase();
  return cost.includes("free") || cost === "$0" || cost === "0";
};

const isPaid = (r: DatabaseRecord) => {
  const comp = (r.compensation ?? "").toLowerCase();
  const cost = (r.cost ?? "").toLowerCase();
  return (
    comp.includes("stipend") ||
    comp.includes("paid") ||
    comp.includes("$") ||
    cost.includes("stipend") ||
    cost.includes("paid position")
  );
};

export const BROWSE_PAGES: BrowsePage[] = [
  // ------------------------------------------------------------- categories
  {
    path: "/summer-internships",
    title: "Summer Internships for High School Students",
    h1: "Summer Internships for High School Students",
    description:
      "Browse verified summer internships for high school students — paid and free programs in science, coding, engineering, and medicine, researched from official sources.",
    intro: [
      "Summer internships give high school students real work experience in labs, hospitals, companies, and universities. Every internship listed here was researched from its official website, with eligibility, deadlines, cost, and application links captured in one structured record.",
      "Use the listings below to compare programs, then apply directly on each internship's official site.",
    ],
    group: "category",
    filter: isInternship,
    related: ["/paid-internships", "/research-programs", "/free-summer-programs", "/high-school-internships"],
  },
  {
    path: "/high-school-internships",
    title: "High School Internships in STEM",
    h1: "Internships for High School Students",
    description:
      "Find high school internships in STEM fields — real openings for teens at universities, hospitals, and research organizations, with eligibility and deadlines verified.",
    intro: [
      "Internships aren't only for college students. Universities, hospitals, national labs, and companies run programs built specifically for high schoolers — many during the summer, some year-round.",
      "Each listing shows eligible grades, location, format, cost, and the official application link so you can verify everything at the source.",
    ],
    group: "category",
    filter: isInternship,
    related: ["/summer-internships", "/stem-internships", "/opportunities-for-11th-graders"],
  },
  {
    path: "/stem-internships",
    title: "STEM Internships for High School Students",
    h1: "STEM Internships for Students",
    description:
      "STEM internships for high school students in science, technology, engineering, and math — compare programs by grade, location, deadline, and cost.",
    intro: [
      "These internships put students inside working STEM environments — research labs, engineering teams, software groups, and clinical settings. Filter the wider database if you want to narrow by a specific field or location.",
    ],
    group: "category",
    filter: (r) => isInternship(r),
    related: ["/engineering-opportunities", "/computer-science-opportunities", "/medical-opportunities"],
  },
  {
    path: "/research-programs",
    title: "Summer Research Programs for High School Students",
    h1: "STEM Research Programs for High School Students",
    description:
      "Summer research programs and lab placements for high school students — university mentorships, science research opportunities, deadlines, and eligibility in one place.",
    intro: [
      "Summer research programs place students in university and institutional labs to work on real projects, often with a mentor. They're one of the strongest ways to explore a STEM field in depth before college.",
      "Listings below include program dates, eligibility, cost, and official application links.",
    ],
    group: "category",
    filter: (r) => typeIs(r, /research/) || matches(r, /\bresearch\b/),
    related: ["/summer-internships", "/science-competitions", "/opportunities-for-11th-graders"],
  },
  {
    path: "/computer-science-opportunities",
    title: "Coding and Computer Science Programs for Teens",
    h1: "Computer Science and Coding Opportunities",
    description:
      "Coding internships and computer science programs for teens — software, AI, data science, and programming opportunities for high school students.",
    intro: [
      "From coding internships to AI research programs and competitive programming, these opportunities help high school students build real software skills. Many are remote, so location is rarely a barrier.",
    ],
    group: "category",
    filter: (r) =>
      matches(r, /comput|software|coding|program?ming|data science|artificial intelligence|\bai\b|machine learning|cyber/),
    related: ["/robotics-opportunities", "/engineering-opportunities", "/locations/remote"],
  },
  {
    path: "/engineering-opportunities",
    title: "Engineering Internships and Programs for Students",
    h1: "Engineering Opportunities for High School Students",
    description:
      "Engineering internships for students — mechanical, electrical, aerospace, civil, and biomedical engineering programs for high schoolers with verified deadlines.",
    intro: [
      "Engineering internships and summer programs let students design, build, and test alongside practicing engineers — from aerospace and robotics to civil and biomedical engineering.",
    ],
    group: "category",
    filter: (r) => matches(r, /engineer/),
    related: ["/robotics-opportunities", "/computer-science-opportunities", "/stem-internships"],
  },
  {
    path: "/medical-opportunities",
    title: "Medical Internships and Programs for High School Students",
    h1: "Medical and Health Science Opportunities",
    description:
      "Medical internships for high school students — hospital volunteering, biomedical research, pre-med summer programs, and health science opportunities.",
    intro: [
      "Interested in medicine, nursing, or biomedical research? These programs range from hospital shadowing and volunteering to funded biomedical research internships for high school students.",
    ],
    group: "category",
    filter: (r) => matches(r, /medic|biomed|health|hospital|clinical|nursing|pre-?med|physician/),
    related: ["/research-programs", "/volunteer-opportunities", "/summer-internships"],
  },
  {
    path: "/robotics-opportunities",
    title: "Robotics Programs and Competitions for Students",
    h1: "Robotics Opportunities for High School Students",
    description:
      "Robotics opportunities for high school students — robotics competitions, engineering camps, and hands-on programs with verified details.",
    intro: [
      "Robotics blends coding, mechanical design, and teamwork. These competitions, camps, and programs give students hands-on build experience at every level.",
    ],
    group: "category",
    filter: (r) => matches(r, /robot/),
    related: ["/engineering-opportunities", "/science-competitions", "/computer-science-opportunities"],
  },
  {
    path: "/science-competitions",
    title: "Science Competitions for High School Students",
    h1: "Science and STEM Competitions",
    description:
      "Science competitions for high school students — research fairs, olympiads, and STEM challenges with entry requirements and deadlines.",
    intro: [
      "Science competitions — from research fairs to olympiads — are a proven way for students to test themselves and stand out. Each listing shows who can enter and when.",
    ],
    group: "category",
    filter: (r) => typeIs(r, /competition/) || matches(r, /competition|olympiad|challenge|fair/),
    related: ["/research-programs", "/robotics-opportunities", "/opportunities-for-teens"],
  },
  {
    path: "/volunteer-opportunities",
    title: "STEM Volunteer Opportunities for Teens",
    h1: "Volunteer Opportunities for High School Students",
    description:
      "STEM volunteering for high school students — hospitals, museums, tutoring, and community science programs that build experience and service hours.",
    intro: [
      "Volunteering builds experience and service hours while you explore a field. These STEM-related volunteer roles suit students at any experience level.",
    ],
    group: "category",
    filter: (r) => typeIs(r, /volunteer/) || matches(r, /volunteer/),
    related: ["/medical-opportunities", "/opportunities-for-teens", "/free-summer-programs"],
  },
  {
    path: "/paid-internships",
    title: "Paid Summer Internships for High School Students",
    h1: "Paid Internships and Stipend Programs",
    description:
      "Paid summer internships for high school students — stipend research programs and paid STEM positions, verified from official sources.",
    intro: [
      "Many STEM programs pay students a stipend or hourly wage. The listings below mention pay or stipends in their researched details — always confirm compensation on the official site before applying.",
    ],
    group: "category",
    filter: isPaid,
    related: ["/summer-internships", "/free-summer-programs", "/research-programs"],
  },
  {
    path: "/free-summer-programs",
    title: "Free STEM Summer Programs for High School Students",
    h1: "Free STEM Summer Programs",
    description:
      "Free STEM summer programs for high school students — no-cost research, coding, and enrichment programs for teens, with eligibility and deadlines.",
    intro: [
      "Cost shouldn't decide who gets access to STEM. Every program below is recorded as free in our researched data — many are competitive, so mind the deadlines.",
    ],
    group: "category",
    filter: isFree,
    related: ["/paid-internships", "/summer-internships", "/volunteer-opportunities"],
  },

  // -------------------------------------------------------------- locations
  {
    path: "/locations/houston",
    title: "Houston Summer Internships and STEM Programs",
    h1: "Houston STEM Opportunities for Teens",
    description:
      "Houston summer internships and STEM programs for high school students — Texas Medical Center, NASA-area, and university opportunities in Houston.",
    intro: [
      "Houston students sit near the Texas Medical Center, NASA Johnson Space Center, and major research universities — a dense hub of STEM programs for high schoolers.",
      "Remote programs are also open to Houston students; browse those on the remote opportunities page.",
    ],
    group: "location",
    filter: (r) => locationHas(r, /houston/),
    related: ["/locations/texas", "/locations/remote", "/summer-internships"],
  },
  {
    path: "/locations/texas",
    title: "Texas STEM Programs and Summer Internships",
    h1: "Texas STEM Programs for High School Students",
    description:
      "Texas STEM programs and summer internships for high school students — opportunities across Houston, Austin, Dallas, and statewide.",
    intro: [
      "From Houston's medical and space institutions to Austin's tech scene, Texas offers a wide range of STEM summer programs and internships for high school students.",
    ],
    group: "location",
    filter: (r) => locationHas(r, /\btexas\b|\btx\b|houston|austin|dallas|san antonio/),
    related: ["/locations/houston", "/locations/united-states", "/stem-internships"],
  },
  {
    path: "/locations/remote",
    title: "Remote and Online STEM Programs for Students",
    h1: "Remote STEM Opportunities",
    description:
      "Remote and online STEM opportunities for high school students — virtual internships, online research programs, and coding courses open from anywhere.",
    intro: [
      "Remote programs remove geography from the equation: virtual internships, online research mentorships, and coding programs students can join from any city.",
    ],
    group: "location",
    filter: (r) =>
      r.program_format === "remote" || r.program_format === "hybrid" || locationHas(r, /remote|online|virtual/),
    related: ["/computer-science-opportunities", "/locations/united-states", "/free-summer-programs"],
  },
  {
    path: "/locations/united-states",
    title: "STEM Opportunities Across the United States",
    h1: "STEM Opportunities in the United States",
    description:
      "STEM internships, research programs, and competitions for high school students across the United States — browse by program type or region.",
    intro: [
      "This page collects nationally available programs and multi-state opportunities across the United States. For region-specific listings, see the Texas and Houston pages.",
    ],
    group: "location",
    filter: (r) =>
      locationHas(r, /united states|nationwide|\busa?\b|national|multiple locations|various/) ||
      r.program_format === "remote",
    related: ["/locations/texas", "/locations/remote", "/summer-internships"],
  },

  // ----------------------------------------------------------------- grades
  {
    path: "/opportunities-for-9th-graders",
    title: "STEM Opportunities for 9th Graders",
    h1: "STEM Opportunities for 9th Graders",
    description:
      "STEM opportunities open to 9th graders — freshman-friendly summer programs, competitions, and camps with verified eligibility.",
    intro: [
      "Freshman year is early — and that's an advantage. These programs explicitly accept 9th graders, so you can start building experience before applications get competitive.",
    ],
    group: "grade",
    filter: (r) => gradeIncludes(r, 9),
    related: ["/opportunities-for-10th-graders", "/opportunities-for-teens", "/free-summer-programs"],
  },
  {
    path: "/opportunities-for-10th-graders",
    title: "STEM Opportunities for 10th Graders",
    h1: "STEM Opportunities for 10th Graders",
    description:
      "STEM programs open to 10th graders — sophomore-eligible summer internships, research programs, and competitions.",
    intro: [
      "Sophomore year opens more doors: many research programs and internships accept 10th graders, and applying now builds a track record for junior-year programs.",
    ],
    group: "grade",
    filter: (r) => gradeIncludes(r, 10),
    related: ["/opportunities-for-11th-graders", "/opportunities-for-9th-graders", "/research-programs"],
  },
  {
    path: "/opportunities-for-11th-graders",
    title: "STEM Opportunities for 11th Graders",
    h1: "STEM Opportunities for 11th Graders",
    description:
      "STEM opportunities for 11th graders — junior-year summer research programs, internships, and competitions that matter for college applications.",
    intro: [
      "Junior year is peak season: most selective research programs and internships target 11th graders. Deadlines often fall in winter, so plan ahead.",
    ],
    group: "grade",
    filter: (r) => gradeIncludes(r, 11),
    related: ["/opportunities-for-12th-graders", "/research-programs", "/paid-internships"],
  },
  {
    path: "/opportunities-for-12th-graders",
    title: "STEM Opportunities for 12th Graders",
    h1: "STEM Opportunities for 12th Graders",
    description:
      "STEM opportunities for 12th graders and graduating seniors — final-year internships, competitions, and bridge programs before college.",
    intro: [
      "Senior year still counts. These programs accept 12th graders — including summer-before-college bridge programs and competitions with senior divisions.",
    ],
    group: "grade",
    filter: (r) => gradeIncludes(r, 12),
    related: ["/opportunities-for-11th-graders", "/summer-internships", "/science-competitions"],
  },
  {
    path: "/opportunities-for-teens",
    title: "STEM Opportunities for Teens",
    h1: "STEM Opportunities for Teens",
    description:
      "STEM opportunities for teens — summer internships, coding programs, competitions, and volunteering for middle and high school students.",
    intro: [
      "Every opportunity in our database is researched for students in grades 6–12. This page shows the full breadth — use the grade pages for listings verified for your exact year.",
    ],
    group: "grade",
    filter: () => true,
    related: ["/opportunities-for-9th-graders", "/summer-internships", "/free-summer-programs"],
  },
];

export function browsePageByPath(path: string): BrowsePage | undefined {
  return BROWSE_PAGES.find((page) => page.path === path);
}
