import { strict as assert } from "node:assert";
import { test } from "node:test";
import { failures, HostLimiter, mapLimit, successes, TimeBudget } from "./concurrency.ts";

test("mapLimit preserves order and respects the cap", async () => {
  let inFlight = 0;
  let peak = 0;
  const items = Array.from({ length: 20 }, (_, i) => i);
  const results = await mapLimit(items, 4, async (n) => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight -= 1;
    return n * 2;
  });
  assert.equal(peak <= 4, true, `peak concurrency was ${peak}`);
  assert.deepEqual(successes(results), items.map((n) => n * 2));
});

test("one failing item does not fail the batch", async () => {
  const results = await mapLimit([1, 2, 3], 2, async (n) => {
    if (n === 2) throw new Error("boom");
    return n;
  });
  assert.deepEqual(successes(results), [1, 3]);
  assert.deepEqual(failures(results), ["boom"]);
  assert.equal(results[1]!.ok, false);
});

test("mapLimit handles an empty list", async () => {
  assert.deepEqual(await mapLimit([], 5, async () => 1), []);
});

test("HostLimiter serialises per host but allows different hosts through", async () => {
  const limiter = new HostLimiter(2);
  let aInFlight = 0;
  let aPeak = 0;
  const tasks: Array<Promise<void>> = [];
  for (let i = 0; i < 6; i++) {
    tasks.push(
      limiter.run("a.example", async () => {
        aInFlight += 1;
        aPeak = Math.max(aPeak, aInFlight);
        await new Promise((r) => setTimeout(r, 5));
        aInFlight -= 1;
      }),
    );
  }
  let bRan = false;
  tasks.push(limiter.run("b.example", async () => { bRan = true; }));
  await Promise.all(tasks);
  assert.equal(aPeak <= 2, true, `per-host peak was ${aPeak}`);
  assert.equal(bRan, true);
});

test("HostLimiter releases slots even when the task throws", async () => {
  const limiter = new HostLimiter(1);
  await assert.rejects(limiter.run("a.example", async () => { throw new Error("x"); }));
  // Would hang if the slot leaked.
  await limiter.run("a.example", async () => undefined);
});

test("TimeBudget reports expiry and headroom", () => {
  const budget = new TimeBudget(1000, Date.now());
  assert.equal(budget.expired, false);
  assert.equal(budget.hasRoom(100), true);
  assert.equal(budget.hasRoom(5000), false);
  const spent = new TimeBudget(1000, Date.now() - 2000);
  assert.equal(spent.expired, true);
  assert.equal(spent.remainingMs, 0);
});
