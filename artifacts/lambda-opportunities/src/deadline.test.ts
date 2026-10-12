import { strict as assert } from "node:assert";
import { test } from "node:test";
import { judgeDeadline, parseDeadline, statusSuggestsClosed } from "./deadline.ts";

const NOW = Date.parse("2026-08-09T00:00:00Z");

test("year-less dates are recurring, never expired", () => {
  // Date.parse("July 5") is 2001-07-05; the old filter read that as expired.
  assert.equal(parseDeadline("July 5").kind, "recurring");
  assert.equal(parseDeadline("March 31").kind, "recurring");
  assert.equal(judgeDeadline("July 5", "Open", NOW).reject, false);
  assert.equal(judgeDeadline("July 5", "Open", NOW).reason, "recurring_cycle");
});

test("explicit years parse as absolute", () => {
  const p = parseDeadline("March 31, 2026");
  assert.equal(p.kind, "absolute");
  assert.equal(p.timestamp, Date.parse("March 31, 2026"));
  assert.equal(parseDeadline("2026-03-31").kind, "absolute");
});

test("rolling deadlines are recognised", () => {
  for (const s of ["Rolling", "Open until filled", "Year-round", "Varies", "No deadline"]) {
    assert.equal(parseDeadline(s).kind, "rolling", s);
    assert.equal(judgeDeadline(s, null, NOW).reject, false, s);
  }
});

test("future deadlines survive", () => {
  const v = judgeDeadline("2027-03-01", "Open", NOW);
  assert.equal(v.reject, false);
  assert.equal(v.reason, "future");
  assert.equal(v.staleDeadline, false);
});

test("recurring annual programs with a past date but an open page are kept and flagged", () => {
  // Real records the old filter discarded on 2026-08-08.
  const engages = judgeDeadline("2026-02-27", "Open", NOW);
  assert.equal(engages.reject, false);
  assert.equal(engages.reason, "stale_but_open");
  assert.equal(engages.staleDeadline, true);

  const pierson = judgeDeadline("March 31, 2026", "Open", NOW);
  assert.equal(pierson.reject, false);
  assert.equal(pierson.reason, "stale_but_open");
});

test("explicitly closed past programs are rejected", () => {
  const v = judgeDeadline("March 8, 2026", "Closed", NOW);
  assert.equal(v.reject, true);
  assert.equal(v.reason, "explicitly_closed");
  assert.equal(statusSuggestsClosed("Closed"), true);
  assert.equal(statusSuggestsClosed("No longer accepting applications"), true);
});

test("a closed status does not reject a still-future deadline", () => {
  // Guards against rejecting a page whose status text is stale but whose date is not.
  assert.equal(judgeDeadline("2027-01-01", "Closed", NOW).reject, false);
});

test("long abandoned listings are rejected regardless of status wording", () => {
  const v = judgeDeadline("2024-01-15", "Open", NOW);
  assert.equal(v.reject, true);
  assert.equal(v.reason, "long_abandoned");
});

test("missing or unparseable deadlines are kept as unknown", () => {
  assert.equal(judgeDeadline(null, null, NOW).reason, "unknown");
  assert.equal(judgeDeadline("see website", null, NOW).reject, false);
  assert.equal(judgeDeadline("", null, NOW).reason, "unknown");
});

test("statusSuggestsClosed is not fooled by 'not closed' style phrasing", () => {
  assert.equal(statusSuggestsClosed("Applications open"), false);
  assert.equal(statusSuggestsClosed("Opens December 5, 2025"), false);
});
