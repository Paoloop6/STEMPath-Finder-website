// Bounded concurrency helpers.
//
// Deliberately dependency-free: this bundle ships to Lambda via esbuild and we
// do not want p-limit or similar pulled in for ~40 lines of logic.

/**
 * Run `worker` over every item with at most `limit` in flight.
 *
 * Results keep input order. A worker that throws never rejects the whole batch:
 * the failure is captured per item so one slow or broken URL cannot take down
 * the run. Callers inspect `ok` to tell success from failure.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<Array<{ ok: true; value: R } | { ok: false; error: Error }>> {
  const results = new Array<{ ok: true; value: R } | { ok: false; error: Error }>(items.length);
  const width = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  await Promise.all(
    Array.from({ length: width }, async () => {
      for (;;) {
        const index = cursor++;
        if (index >= items.length) return;
        try {
          results[index] = { ok: true, value: await worker(items[index]!, index) };
        } catch (error) {
          results[index] = {
            ok: false,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      }
    }),
  );
  return results;
}

/** Collect only the successful values from mapLimit. */
export function successes<R>(
  results: Array<{ ok: true; value: R } | { ok: false; error: Error }>,
): R[] {
  const out: R[] = [];
  for (const r of results) if (r.ok) out.push(r.value);
  return out;
}

/** Collect the failures from mapLimit, as messages. */
export function failures(
  results: Array<{ ok: true; value: unknown } | { ok: false; error: Error }>,
): string[] {
  const out: string[] = [];
  for (const r of results) if (!r.ok) out.push(r.error.message);
  return out;
}

/**
 * Per-host serialisation on top of a global cap, so we stay polite to any one
 * source website while still keeping the global fetch pool busy.
 */
export class HostLimiter {
  readonly #perHost: number;
  readonly #active = new Map<string, number>();
  readonly #waiting = new Map<string, Array<() => void>>();

  constructor(perHost: number) {
    this.#perHost = Math.max(1, perHost);
  }

  async acquire(host: string): Promise<void> {
    const active = this.#active.get(host) ?? 0;
    if (active < this.#perHost) {
      this.#active.set(host, active + 1);
      return;
    }
    await new Promise<void>((resolve) => {
      const queue = this.#waiting.get(host) ?? [];
      queue.push(resolve);
      this.#waiting.set(host, queue);
    });
  }

  release(host: string): void {
    const queue = this.#waiting.get(host);
    if (queue && queue.length > 0) {
      // Hand the slot straight to the next waiter; active count is unchanged.
      queue.shift()!();
      if (queue.length === 0) this.#waiting.delete(host);
      return;
    }
    const active = (this.#active.get(host) ?? 1) - 1;
    if (active <= 0) this.#active.delete(host);
    else this.#active.set(host, active);
  }

  async run<T>(host: string, fn: () => Promise<T>): Promise<T> {
    await this.acquire(host);
    try {
      return await fn();
    } finally {
      this.release(host);
    }
  }
}

/** Wall-clock budget guard so a run always finishes inside the Lambda timeout. */
export class TimeBudget {
  readonly #deadline: number;

  constructor(totalMs: number, startedAt: number = Date.now()) {
    this.#deadline = startedAt + totalMs;
  }

  get remainingMs(): number {
    return Math.max(0, this.#deadline - Date.now());
  }

  get expired(): boolean {
    return this.remainingMs <= 0;
  }

  /** True while at least `reserveMs` of headroom remains for wrap-up work. */
  hasRoom(reserveMs: number): boolean {
    return this.remainingMs > reserveMs;
  }
}
