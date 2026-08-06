/**
 * Copy for the standalone public pages that aren't config-driven (browse pages
 * and guides have their own modules). Kept as data so the build-time
 * prerenderer emits exactly the text these components render.
 *
 * Accuracy note: this copy describes an automated research pipeline. It must
 * not claim human expert review, partnerships, endorsements, or nonprofit
 * status, none of which exist.
 */

export const HOW_IT_WORKS_H1 = "How NextStep Database Researches Opportunities";

export const HOW_IT_WORKS_INTRO: string[] = [
  "Every record here starts from a program's own website. An automated research pipeline reads the official page, extracts the details students actually need — eligibility, grade range, location and format, cost or stipend, deadline, and the application link — and stores them as one structured record so they can be compared side by side.",
  "The pipeline re-checks records on a recurring schedule and removes listings whose deadlines have passed. What it does not do is judge program quality, and it is not a human reviewing each entry. Extraction can misread an unusual page, and programs change their own rules mid-cycle without warning. Treat every record as a well-organised pointer to the official source, and confirm the details there before you apply.",
];

export const DIFFERENCE_H1 = "Why a Researched Database, Not a Chatbot";

export const DIFFERENCE_INTRO: string[] = [
  "Ask a general chatbot for STEM programs and it will produce a fluent, plausible list. Some of it will be real. Some of it will be a program that closed years ago, a deadline that was never true, or a link that goes nowhere — presented with exactly the same confidence as the accurate entries.",
  "This database works the other way round. Nothing is generated: every field traces back to a page on the program's own site, and when a detail is missing from that page it is left blank rather than filled in with a guess. That makes the listings less complete than an invented answer, and more trustworthy than one.",
];
