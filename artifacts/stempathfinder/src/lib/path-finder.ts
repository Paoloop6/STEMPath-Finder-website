/**
 * Content for /stem-path-finder.
 *
 * Kept as data, like guides.ts and browse-pages.ts, so the React page and the
 * build-time prerenderer render the same text from one source. If these ever
 * diverge, the prerendered HTML would no longer match what a user sees.
 */

export interface Pathway {
  /** Stable id, also the anchor target. */
  id: string;
  name: string;
  /** What the field actually involves, in plain language. */
  summary: string;
  /** Concrete things a student in this pathway might do this year. */
  startingPoints: string[];
  /** [label, path] into a category page or guide. */
  links: Array<[string, string]>;
}

export const PATH_FINDER_TITLE = "STEM Path Finder for Students";

export const PATH_FINDER_H1 =
  "STEM Path Finder for Middle and High School Students";

export const PATH_FINDER_DESCRIPTION =
  "Explore STEM pathways and find verified opportunities in engineering, computer science, medicine, robotics, research, and volunteering.";

export const PATH_FINDER_INTRO: string[] = [
  "A STEM path finder is a way of narrowing an enormous field down to the few things you can actually do next. “STEM” covers everything from writing software to running lab assays to building competition robots, and the programs behind those areas have different deadlines, different grade requirements, and different costs. Browsing them all at once is how most students give up.",
  "This page splits STEM into six practical pathways. For each one you get what the work actually involves, what a realistic first step looks like at your grade level, and a direct link to the verified opportunities in this database that match. You do not need to commit to a pathway — most students who end up in engineering started somewhere else, and the overlap between these areas is large.",
];

export const PATHWAYS: Pathway[] = [
  {
    id: "engineering",
    name: "Engineering",
    summary:
      "Designing and building physical systems — mechanical, electrical, civil, aerospace, chemical. Engineering programs tend to be project-based: you leave with something you built and can explain.",
    startingPoints: [
      "Join or start a design team (rocketry, bridge building, solar car) where you own one subsystem rather than helping generally.",
      "Apply to a university summer engineering program the winter before you want to attend — most close between January and March.",
      "Learn one CAD tool well enough to produce a drawing someone else could build from.",
    ],
    links: [
      ["Engineering opportunities", "/engineering-opportunities"],
      ["Summer internships", "/summer-internships"],
      ["Research programs", "/research-programs"],
    ],
  },
  {
    id: "computer-science",
    name: "Computer science and software",
    summary:
      "Programming, algorithms, data, and increasingly machine learning. This is the most accessible pathway without a program: the tools are free and the work can be done from anywhere.",
    startingPoints: [
      "Build and finish one project that a stranger can use. A finished small thing beats an abandoned ambitious thing.",
      "Enter a hackathon — most accept beginners and many are remote, so cost and location are rarely blockers.",
      "Contribute a documentation fix to an open-source project to learn how real codebases work.",
    ],
    links: [
      ["Computer science opportunities", "/computer-science-opportunities"],
      ["Remote opportunities", "/locations/remote"],
      ["Free summer programs", "/free-summer-programs"],
    ],
  },
  {
    id: "medicine",
    name: "Medicine and health sciences",
    summary:
      "Clinical exposure, public health, and biomedical research. This pathway has the strictest age and liability rules — many hospital programs require you to be 16 or 18, so read eligibility before investing time in an application.",
    startingPoints: [
      "Volunteer somewhere that involves sustained patient or community contact rather than a one-day event.",
      "Look for hospital or medical-school summer programs aimed at your specific grade; age floors are common and non-negotiable.",
      "Take on a research role in a wet lab if one is available locally — many accept high schoolers for unpaid summer work.",
    ],
    links: [
      ["Medical opportunities", "/medical-opportunities"],
      ["Volunteer opportunities", "/volunteer-opportunities"],
      ["Research programs", "/research-programs"],
    ],
  },
  {
    id: "robotics",
    name: "Robotics",
    summary:
      "Where mechanical design, electronics, and code meet. Robotics is unusually good for students who are not sure which of those three they like, because a competition team needs all of them.",
    startingPoints: [
      "Join a competition team (FIRST, VEX, or a local league) and take responsibility for one subsystem end to end.",
      "If no team exists at your school, starting one is itself the kind of initiative programs and admissions officers notice.",
      "Learn to solder and to read a wiring diagram — both are quick to pick up and immediately useful.",
    ],
    links: [
      ["Robotics opportunities", "/robotics-opportunities"],
      ["Science competitions", "/science-competitions"],
      ["Engineering opportunities", "/engineering-opportunities"],
    ],
  },
  {
    id: "research",
    name: "Scientific research",
    summary:
      "Working on an open question under a mentor, usually in a university lab, in biology, chemistry, physics, environmental science, or mathematics. The most competitive summer programs live here.",
    startingPoints: [
      "Read about work happening at a nearby university and email one professor about a specific paper, not a generic request.",
      "Apply to structured summer research programs in the autumn — the selective ones close in December and January.",
      "Enter a science fair; the process of forming a question and defending a method is the skill research programs screen for.",
    ],
    links: [
      ["Research programs", "/research-programs"],
      ["Science competitions", "/science-competitions"],
      ["When to apply for summer programs", "/guides/when-to-apply-for-summer-programs"],
    ],
  },
  {
    id: "volunteering",
    name: "STEM volunteering and outreach",
    summary:
      "Teaching, tutoring, and community technical work. Often overlooked, but it is the most available pathway if you have no experience, no budget, and no nearby university.",
    startingPoints: [
      "Tutor maths or science regularly — consistency over a school year counts for more than a single summer.",
      "Help run a STEM camp or club for younger students; organisers are usually short-handed.",
      "Look for community projects such as environmental monitoring or device repair that need volunteers.",
    ],
    links: [
      ["Volunteer opportunities", "/volunteer-opportunities"],
      ["STEM opportunities with no experience", "/guides/stem-opportunities-with-no-experience"],
      ["Free summer programs", "/free-summer-programs"],
    ],
  },
];

export interface FinderQuestion {
  question: string;
  /** Why the answer changes which opportunities are realistic. */
  why: string;
  links: Array<[string, string]>;
}

export const FINDER_QUESTIONS: FinderQuestion[] = [
  {
    question: "What grade are you in right now?",
    why: "Grade is the single most common eligibility filter. Many research programs accept only 11th and 12th graders, while 9th and 10th graders have more competitions, camps and volunteering open to them. Applying to a program you are too young for is the most common wasted application.",
    links: [
      ["9th graders", "/opportunities-for-9th-graders"],
      ["10th graders", "/opportunities-for-10th-graders"],
      ["11th graders", "/opportunities-for-11th-graders"],
      ["12th graders", "/opportunities-for-12th-graders"],
    ],
  },
  {
    question: "Can you travel, or do you need something local or remote?",
    why: "Residential programs add travel and housing costs that are often larger than the programme fee itself. Remote options remove that entirely, and if you are in the Houston or wider Texas area there is a substantial local set worth checking before looking further afield.",
    links: [
      ["Remote opportunities", "/locations/remote"],
      ["Houston", "/locations/houston"],
      ["Texas", "/locations/texas"],
      ["United States", "/locations/united-states"],
    ],
  },
  {
    question: "What can you afford?",
    why: "Programme costs range from free to several thousand dollars. Some pay a stipend instead of charging. Filtering on cost early avoids building a shortlist you cannot use — and free and paid programmes are frequently the more selective ones, not the lesser ones.",
    links: [
      ["Free summer programs", "/free-summer-programs"],
      ["Paid internships", "/paid-internships"],
      ["Free STEM programs guide", "/guides/free-stem-programs-for-high-school-students"],
    ],
  },
  {
    question: "How much time do you actually have?",
    why: "A six-week residential research programme and a weekend hackathon ask for very different commitments. Being honest about your term-time and summer availability matters more than picking the most prestigious option and dropping out of it.",
    links: [
      ["Summer internships", "/summer-internships"],
      ["Science competitions", "/science-competitions"],
      ["Volunteer opportunities", "/volunteer-opportunities"],
    ],
  },
  {
    question: "Do you have any experience yet?",
    why: "Plenty of good programmes explicitly expect none. If every listing you find seems to want prior research, you are looking at the wrong tier — there is an entire category of entry-level opportunities designed for a first step.",
    links: [
      ["No experience needed", "/guides/stem-opportunities-with-no-experience"],
      ["How to apply", "/guides/how-to-apply-for-a-high-school-internship"],
      ["Volunteer opportunities", "/volunteer-opportunities"],
    ],
  },
];

export interface UsageExample {
  situation: string;
  approach: string;
}

export const USAGE_EXAMPLES: UsageExample[] = [
  {
    situation:
      "A 9th grader in Houston with no experience and no budget",
    approach:
      "Start with the 9th-grade and Houston pages to see what is genuinely open at that age locally, then read the no-experience guide. Expect competitions, volunteering and free camps rather than lab research — that comes later, and starting early is not the same as starting selective.",
  },
  {
    situation:
      "An 11th grader who wants a research placement next summer",
    approach:
      "Work backwards from deadlines. Open the research programs page in the autumn, note which close in December and January, and use the timing guide to build a schedule. By April most selective summer research doors have already closed.",
  },
  {
    situation:
      "A 10th grader who likes coding but cannot travel",
    approach:
      "Filter to remote opportunities and computer science, where location matters least of any pathway. Combine one remote programme with a self-directed project, since software is the one area where independent work is genuinely visible to reviewers.",
  },
  {
    situation:
      "A 12th grader who needs something before applications are due",
    approach:
      "Look at paid internships and competitions with near-term deadlines, and check the application-status field on each record. Be realistic: a short, finished, well-explained commitment reads better than an ambitious one you abandoned.",
  },
];
