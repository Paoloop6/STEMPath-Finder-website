import { strict as assert } from "node:assert";
import { test } from "node:test";
import { isSupportingRole, screenPage, type PageSample } from "./screening.ts";

function sample(over: Partial<PageSample>): PageSample {
  return {
    url: "https://x.edu/page",
    title: "",
    description: "",
    headings: [],
    textSample: "",
    ...over,
  };
}

test("a real program page is extraction worthy", () => {
  const r = screenPage(
    sample({
      url: "https://x.edu/programs/summer-research",
      title: "Summer Research Program for High School Students",
      description: "A six week research experience in engineering.",
      headings: ["Eligibility", "Important Dates"],
    }),
  );
  assert.equal(r.extractionWorthy, true);
  // "opportunity" and "directory" both mean program-like, and a path segment of
  // /programs/ makes the two genuinely ambiguous. Only the behaviour matters.
  assert.equal(r.role === "opportunity" || r.role === "directory", true, `role was ${r.role}`);
});

test("supporting pages are crawled but not extracted on their own", () => {
  const r = screenPage(
    sample({
      url: "https://x.edu/programs/summer/eligibility",
      title: "Eligibility",
      textSample: "Who can apply: students must be entering grades 10 to 12.",
    }),
  );
  assert.equal(r.keepCrawling, true);
  assert.equal(r.extractionWorthy, false);
  assert.equal(isSupportingRole(r.role), true);
});

test("an unrelated page is still crawled so its links are not lost", () => {
  const r = screenPage(sample({ url: "https://x.edu/about", title: "About the University" }));
  assert.equal(r.keepCrawling, true, "traversal must not stop at a low-scoring page");
  assert.equal(r.extractionWorthy, false);
});

test("binary assets and dead ends are not crawled", () => {
  assert.equal(screenPage(sample({ url: "https://x.edu/a/logo.png" })).keepCrawling, false);
  assert.equal(screenPage(sample({ url: "https://x.edu/login" })).keepCrawling, false);
  assert.equal(screenPage(sample({ url: "https://x.edu/cart" })).keepCrawling, false);
});

test("a program directory is worth extracting", () => {
  const r = screenPage(
    sample({
      url: "https://x.edu/k12/programs",
      title: "Programs for High School Students",
      headings: ["Robotics Camp", "Biology Institute", "Engineering Academy"],
    }),
  );
  assert.equal(r.role === "directory" || r.role === "opportunity", true);
  assert.equal(r.extractionWorthy, true);
});

test("a program-shaped page with no student or STEM signal is not extracted", () => {
  // Guards the cost path: a generic adult workshop page should not earn a model call.
  const r = screenPage(
    sample({ url: "https://x.edu/hr/workshop", title: "Leadership Workshop", textSample: "For staff." }),
  );
  assert.equal(r.extractionWorthy, false);
});

test("URL path signals count more than body text alone", () => {
  const withPath = screenPage(
    sample({ url: "https://x.edu/high-school/summer-program", title: "Details" }),
  );
  const withoutPath = screenPage(sample({ url: "https://x.edu/p/1", title: "Details" }));
  assert.equal(withPath.score > withoutPath.score, true);
});

test("news and blog articles are crawled but never extracted", () => {
  // A news story about a program matches the same keywords as the program page.
  const r = screenPage(
    sample({
      url: "https://x.edu/news/2013/innovative-summer-program-for-high-school-students",
      title: "Innovative summer program reaches high school students",
      textSample: "The engineering summer program welcomed students in grades 9 to 12.",
    }),
  );
  assert.equal(r.extractionWorthy, false);
  assert.equal(r.keepCrawling, true, "articles still link to the real program page");
});
