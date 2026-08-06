/**
 * Editorial guide pages: original, useful content with links into the
 * category and opportunity pages. Kept as data so every guide renders
 * through one template with consistent SEO handling.
 */

export interface GuideSection {
  heading: string;
  paragraphs: string[];
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: GuideSection[];
  /** [label, path] pairs into category/location pages. */
  links: Array<[string, string]>;
}

export const GUIDES: Guide[] = [
  {
    slug: "summer-internships-for-high-school-students",
    title: "How to Find Summer Internships for High School Students",
    description:
      "A practical guide to finding summer internships as a high school student — where to look, when to apply, and how to stand out without prior experience.",
    h1: "Summer Internships for High School Students: A Practical Guide",
    intro:
      "Summer internships for high school students are real — but they don't advertise the way college internships do. Most live on university, hospital, and lab websites, each with its own eligibility rules and deadlines. This guide explains how to find them and when to apply.",
    sections: [
      {
        heading: "Where high school internships actually come from",
        paragraphs: [
          "The majority of legitimate high school internships are run by universities, teaching hospitals, government labs, and museums — not private companies. Programs like university summer research placements recruit students in grades 10–12, often with stipends.",
          "Company internships for high schoolers exist but are rarer and usually local. Community organizations, startups, and family businesses are more approachable: a short, specific email offering to help with a real task works better than a generic application.",
        ],
      },
      {
        heading: "The application timeline",
        paragraphs: [
          "Most selective summer programs open applications between November and January and close between December and March. If you start looking in April, most competitive doors have already closed for that summer.",
          "A good rhythm: research programs in the fall, draft essays over winter break, submit in January and February, and keep a few rolling-admission or local options as backups for spring.",
        ],
      },
      {
        heading: "What programs look for",
        paragraphs: [
          "Grades matter less than demonstrated interest. A student who built a small project, competed in a science fair, or volunteered in a related setting beats a straight-A student with a blank resume. Teacher recommendations carry real weight for research programs — ask early.",
        ],
      },
    ],
    links: [
      ["Browse summer internships", "/summer-internships"],
      ["Paid internships and stipend programs", "/paid-internships"],
      ["Research programs", "/research-programs"],
      ["Opportunities for 11th graders", "/opportunities-for-11th-graders"],
    ],
  },
  {
    slug: "stem-opportunities-with-no-experience",
    title: "STEM Opportunities for Students With No Experience",
    description:
      "You don't need a resume to start in STEM. Entry points for beginners: volunteering, camps, competitions, and first programs that accept students with no background.",
    h1: "STEM Opportunities for Students With No Experience",
    intro:
      "Every impressive applicant started with nothing on their resume. Plenty of STEM opportunities are designed for exactly that starting point — the trick is picking entry points that don't screen for prior experience.",
    sections: [
      {
        heading: "Start with volunteering and open competitions",
        paragraphs: [
          "Hospital and museum volunteering, community science events, and tutoring roles rarely require experience — they require showing up. They also produce the references and stories that stronger applications are built from.",
          "Open competitions (science fairs, coding challenges, robotics leagues with rookie divisions) judge the work you submit, not your resume. Losing your first one still counts as experience.",
        ],
      },
      {
        heading: "Free and beginner-friendly programs",
        paragraphs: [
          "Many free summer programs exist specifically to widen access for students without prior exposure. Because they're free, they can be competitive — apply to several, and treat essays as the place to show curiosity rather than credentials.",
        ],
      },
      {
        heading: "Build one small proof of interest",
        paragraphs: [
          "A tiny self-driven project — a coded game, a documented experiment, a robotics build log — outweighs a blank application. It gives every future essay and interview something concrete to point at.",
        ],
      },
    ],
    links: [
      ["Volunteer opportunities", "/volunteer-opportunities"],
      ["Free STEM summer programs", "/free-summer-programs"],
      ["Science competitions", "/science-competitions"],
      ["Opportunities for 9th graders", "/opportunities-for-9th-graders"],
    ],
  },
  {
    slug: "houston-summer-programs",
    title: "Houston Summer Programs for High School Students",
    description:
      "How Houston students can use the Texas Medical Center, NASA Johnson Space Center, and local universities to find summer STEM programs and internships.",
    h1: "Houston Summer Programs for High School Students",
    intro:
      "Houston is one of the best cities in the country to be a STEM-interested high schooler: the world's largest medical complex, NASA's Johnson Space Center, and multiple research universities all run student programs within driving distance.",
    sections: [
      {
        heading: "The three Houston anchors",
        paragraphs: [
          "The Texas Medical Center institutions offer volunteering, shadowing, and structured research programs for high school students interested in medicine and biomedical science.",
          "NASA Johnson Space Center and its surrounding aerospace contractors run internships and challenge programs for Texas students. University programs at Rice, the University of Houston, and Baylor College of Medicine round out the research options.",
        ],
      },
      {
        heading: "Don't ignore remote programs",
        paragraphs: [
          "Living in Houston doesn't limit you to Houston. Remote research mentorships and online coding programs are open to Texas students and combine well with a local volunteering role over the same summer.",
        ],
      },
    ],
    links: [
      ["Houston opportunities", "/locations/houston"],
      ["Texas STEM programs", "/locations/texas"],
      ["Medical opportunities", "/medical-opportunities"],
      ["Remote opportunities", "/locations/remote"],
    ],
  },
  {
    slug: "how-to-apply-for-a-high-school-internship",
    title: "How to Apply for a High School Internship",
    description:
      "Step-by-step: how to apply for a high school internship — building a simple resume, asking for recommendations, writing essays, and hitting deadlines.",
    h1: "How to Apply for a High School Internship",
    intro:
      "Most internship applications for high school students come down to four artifacts: a one-page resume, a short essay, one or two recommendations, and an on-time submission. Here's how to handle each.",
    sections: [
      {
        heading: "1. A one-page resume",
        paragraphs: [
          "List education, activities, projects, and any work or volunteering — with one concrete line each about what you actually did. No high schooler needs more than one page, and reviewers don't expect professional experience.",
        ],
      },
      {
        heading: "2. Recommendations, requested early",
        paragraphs: [
          "Ask a STEM teacher who knows your work at least three weeks before the deadline, and hand them your resume plus a sentence about why you want this specific program. Rushed recommendations read rushed.",
        ],
      },
      {
        heading: "3. Essays that answer the real question",
        paragraphs: [
          "Every prompt is secretly asking: why this program, and what will you do with it? Name specific parts of the program, connect them to something you've already tried, and skip generic passion statements.",
        ],
      },
      {
        heading: "4. Deadlines and follow-through",
        paragraphs: [
          "Track every deadline in one place and aim to submit a week early — portals crash, recommenders forget. After acceptance or rejection, a short thank-you keeps the door open for next year.",
        ],
      },
    ],
    links: [
      ["Summer internships", "/summer-internships"],
      ["When programs open and close", "/guides/when-to-apply-for-summer-programs"],
      ["Browse the full database", "/database"],
    ],
  },
  {
    slug: "when-to-apply-for-summer-programs",
    title: "When to Apply for Summer Programs",
    description:
      "The real timeline of summer program applications — month by month, from fall research to spring backups, so you never miss a deadline.",
    h1: "When to Apply for Summer Programs",
    intro:
      "The single most common mistake students make is starting in spring. Selective summer programs run on a school-year clock: research in fall, apply in winter, hear back in spring, attend in summer.",
    sections: [
      {
        heading: "September–November: build the list",
        paragraphs: [
          "Collect 8–15 candidate programs and record each deadline, eligibility rule, and required material. This is also the moment to ask teachers for recommendations for winter deadlines.",
        ],
      },
      {
        heading: "December–February: submit",
        paragraphs: [
          "Most competitive research programs and internships close in this window. Draft essays over winter break and submit early — some programs review on a rolling basis.",
        ],
      },
      {
        heading: "March–May: decisions and backups",
        paragraphs: [
          "Acceptances land in early spring. If results don't go your way, pivot to rolling-admission programs, local volunteering, camps, and self-driven projects — a productive summer is still fully available.",
        ],
      },
    ],
    links: [
      ["Summer internships", "/summer-internships"],
      ["Free summer programs", "/free-summer-programs"],
      ["How to apply", "/guides/how-to-apply-for-a-high-school-internship"],
    ],
  },
  {
    slug: "free-stem-programs-for-high-school-students",
    title: "Free STEM Programs for High School Students",
    description:
      "Where to find free STEM programs for high school students — no-cost research programs, funded internships, and free online courses that are worth the time.",
    h1: "Free STEM Programs for High School Students",
    intro:
      "Cost is the most common reason students skip summer programs — and the most avoidable. Free and fully funded STEM programs exist at every level of competitiveness, from open online courses to selective residential research programs.",
    sections: [
      {
        heading: "Three tiers of free",
        paragraphs: [
          "Open-access: free online courses and community programs that accept everyone — the fastest way to start this week.",
          "Application-based free programs: no cost to attend, but limited seats. Most university outreach programs fall here.",
          "Funded programs: not just free — they pay you. Stipend research internships are the most competitive tier and worth the application effort for juniors and seniors.",
        ],
      },
      {
        heading: "Watch for hidden costs",
        paragraphs: [
          "A 'free' residential program may still require travel or meal costs. Many programs offer need-based travel support — the researched details on each listing note cost information, and the official site will state what's covered.",
        ],
      },
    ],
    links: [
      ["Free STEM summer programs", "/free-summer-programs"],
      ["Paid internships", "/paid-internships"],
      ["Volunteer opportunities", "/volunteer-opportunities"],
    ],
  },
];

export function guideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
