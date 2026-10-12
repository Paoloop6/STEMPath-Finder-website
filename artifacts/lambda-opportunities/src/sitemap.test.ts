import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  extractLinks,
  extractOgImage,
  extractPageSignals,
  isDisallowed,
  isSitemapIndex,
  parseSitemapLocations,
  sitemapsFromRobots,
  stripTags,
} from "./sitemap.ts";

test("parses sitemap locations and decodes entities", () => {
  const xml = `<urlset><url><loc>https://x.edu/a?b=1&amp;c=2</loc></url><url><loc>https://x.edu/b</loc></url></urlset>`;
  assert.deepEqual(parseSitemapLocations(xml), ["https://x.edu/a?b=1&c=2", "https://x.edu/b"]);
  assert.equal(isSitemapIndex(xml), false);
});

test("detects a sitemap index", () => {
  const xml = `<sitemapindex><sitemap><loc>https://x.edu/s1.xml</loc></sitemap></sitemapindex>`;
  assert.equal(isSitemapIndex(xml), true);
  assert.deepEqual(parseSitemapLocations(xml), ["https://x.edu/s1.xml"]);
});

test("extracts and resolves anchor links, skipping non-http schemes", () => {
  const html = `
    <a href="/programs/summer">Summer</a>
    <a href='https://other.org/x'>Other</a>
    <a href="mailto:a@b.c">Mail</a>
    <a href="#top">Top</a>
    <a href="javascript:void(0)">JS</a>
    <a href="apply.html">Apply now</a>`;
  const links = extractLinks(html, "https://x.edu/programs/index.html");
  const urls = links.map((l) => l.url);
  assert.deepEqual(urls, [
    "https://x.edu/programs/summer",
    "https://other.org/x",
    "https://x.edu/programs/apply.html",
  ]);
  assert.equal(links[0]!.text, "Summer");
});

test("anchor extraction deduplicates repeated hrefs", () => {
  const html = `<a href="/a">one</a><a href="/a">two</a>`;
  assert.equal(extractLinks(html, "https://x.edu/").length, 1);
});

test("extracts title, description and headings", () => {
  const html = `
    <title>Summer Research Program</title>
    <meta name="description" content="For high school students">
    <h1>Overview</h1><h2>Eligibility</h2>`;
  const signals = extractPageSignals(html);
  assert.equal(signals.title, "Summer Research Program");
  assert.equal(signals.description, "For high school students");
  assert.deepEqual(signals.headings, ["Overview", "Eligibility"]);
});

test("falls back to the Open Graph description", () => {
  const html = `<meta property="og:description" content="OG text">`;
  assert.equal(extractPageSignals(html).description, "OG text");
});

test("extracts and resolves an Open Graph image", () => {
  assert.equal(
    extractOgImage(`<meta property="og:image" content="/img/hero.png">`, "https://x.edu/p/"),
    "https://x.edu/img/hero.png",
  );
  assert.equal(extractOgImage("<html></html>", "https://x.edu/"), null);
});

test("reads sitemap declarations out of robots.txt", () => {
  const robots = "User-agent: *\nDisallow: /admin\nSitemap: https://x.edu/sitemap.xml\n";
  assert.deepEqual(sitemapsFromRobots(robots), ["https://x.edu/sitemap.xml"]);
});

test("honours robots.txt Disallow rules", () => {
  const robots = "User-agent: *\nDisallow: /private\nDisallow: /admin\n";
  assert.equal(isDisallowed(robots, "/private/thing"), true);
  assert.equal(isDisallowed(robots, "/programs/summer"), false);
});

test("an empty Disallow blocks nothing", () => {
  assert.equal(isDisallowed("User-agent: *\nDisallow:\n", "/anything"), false);
});

test("rules from another agent's group do not apply to us", () => {
  const robots = "User-agent: BadBot\nDisallow: /\n\nUser-agent: *\nDisallow: /admin\n";
  assert.equal(isDisallowed(robots, "/programs"), false);
  assert.equal(isDisallowed(robots, "/admin/x"), true);
});

test("stripTags collapses markup to readable text", () => {
  assert.equal(stripTags("<p>Hello <b>world</b></p>"), "Hello world");
});
