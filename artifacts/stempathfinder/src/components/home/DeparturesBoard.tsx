import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { openWithTransition } from '@/lib/open-transition';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Pause, Play, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { myBoard, useMyBoard } from '@/lib/my-board';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { fetchOpportunityStats } from '@/lib/live-stats';
import { fetchDatabaseRecords, gradeLabel, humanize, type DatabaseRecord } from '@/lib/database-records';
import { recordPath } from '@/components/OpportunityRow';

/* ---------------------------------------------------------------------------
 * Data
 * ------------------------------------------------------------------------- */

/** Enough rows to filter within without pulling the whole table. */
const BOARD_FETCH = 200;
const BOARD_ROWS = 10;
/** A real board pages on a timer. Long enough to read ten rows. */
const PAGE_MS = 20_000;

/** The board shows what closes next: real future deadlines first, soonest at
 * the top, then rows whose deadline we could not read. Rows that have already
 * passed or are marked closed are not departures anymore and stay off it. */
function boardOrder(records: DatabaseRecord[], now: Date): DatabaseRecord[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dated: Array<[number, DatabaseRecord]> = [];
  const undated: DatabaseRecord[] = [];
  for (const r of records) {
    if (statusKind(r.application_status) === 'closed') continue;
    const d = parseDate(r.application_deadline);
    if (d) {
      if (d.getTime() < today.getTime()) continue;
      dated.push([d.getTime(), r]);
    } else {
      undated.push(r);
    }
  }
  dated.sort((a, b) => a[0] - b[0]);
  return [...dated.map(([, r]) => r), ...undated];
}

async function fetchBoard() {
  const { records, meta } = await fetchDatabaseRecords(false, BOARD_FETCH);
  return { records: boardOrder(records.slice(0, BOARD_FETCH), new Date()), total: meta.count };
}

type Tone = 'amber' | 'yellow' | 'green' | 'red' | 'dim' | undefined;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Deadlines arrive as free text: "2026-09-14", "2026-05-08 11:59 PM ET",
 * "3/1/2027", "April 10, 2026 (regular decision)". Take the first date we can
 * read with confidence; anything else is honestly unknown. */
function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
  const us = value.match(/(^|\D)(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return new Date(Number(us[4]), Number(us[2]) - 1, Number(us[3]), 12);
  const eu = value.match(/(^|\D)(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (eu) return new Date(Number(eu[4]), Number(eu[3]) - 1, Number(eu[2]), 12);
  const words = value.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (words) {
    const d = new Date(`${words[1].slice(0, 3)} ${words[2]} ${words[3]} 12:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

type StatusKind = 'open' | 'closed' | 'soon' | null;

/** Free-text application status, read conservatively. Unknown stays unknown. */
function statusKind(value: string | null): StatusKind {
  if (!value) return null;
  const s = value.toLowerCase();
  if (/closed|ended|\bfull\b|filled|cancel|suspend|hiatus|not accepting|no longer|concluded|unavailable|paused|sold out|passed|not currently|not offered|at capacity|invitation only|by referral/.test(s)) return 'closed';
  if (/not yet|opens |opening|coming soon|upcoming|\bsoon\b|future|check back|expected to open|available (early|in)/.test(s)) return 'soon';
  if (/^open|\bopen\b|accepting|enrolling|recruiting|rolling|registering|\blive\b|first-come|waitlist open|grace period/.test(s)) return 'open';
  return null;
}

function daysUntil(d: Date, now: Date): number {
  return Math.round((d.getTime() - now.getTime()) / 86_400_000);
}

/** "SEP 15" — six characters, one flap each, or a dash when unknown. */
function deadlineFlaps(record: DatabaseRecord): string {
  const d = parseDate(record.application_deadline);
  if (!d) return '  TBA ';
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
}

/** Status is a law, not a mood. Only a recorded status or a real date sets it. */
function statusOf(record: DatabaseRecord, now: Date): { text: string; tone: Tone } {
  const kind = statusKind(record.application_status);
  if (kind === 'open') return { text: 'OPEN', tone: 'green' };
  if (kind === 'closed') return { text: 'CLOSED', tone: 'red' };
  if (kind === 'soon') return { text: 'SOON', tone: 'yellow' };
  const d = parseDate(record.application_deadline);
  if (d) {
    const n = daysUntil(d, now);
    if (n < 0) return { text: 'PASSED', tone: 'red' };
    if (n <= 14) return { text: `${n}D LEFT`, tone: 'yellow' };
    return { text: 'LISTED', tone: undefined };
  }
  return { text: '—', tone: 'dim' };
}

/** "in 6 days", "today", or "date TBA". Unknown stays unknown. */
function daysLine(record: DatabaseRecord, now: Date): string {
  const d = parseDate(record.application_deadline);
  if (!d) return 'date not listed';
  const n = daysUntil(d, now);
  if (n <= 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n < 45) return `in ${n} days`;
  const w = Math.round(n / 7);
  if (n < 120) return `in ${w} weeks`;
  return `in ${Math.round(n / 30)} months`;
}

function shortType(record: DatabaseRecord): string {
  const t = humanize(record.opportunity_type).toLowerCase();
  if (!t) return '—';
  if (t.includes('intern')) return 'Internship';
  if (t.includes('compet') || t.includes('olympiad') || t.includes('challenge')) return 'Competition';
  if (t.includes('research')) return 'Research';
  if (t.includes('scholar') || t.includes('award') || t.includes('fellow')) return 'Scholarship';
  if (t.includes('camp') || t.includes('summer') || t.includes('academy') || t.includes('institute')) return 'Summer';
  if (t.includes('volunt')) return 'Volunteer';
  if (t.includes('mentor')) return 'Mentorship';
  if (t.includes('pre-college') || t.includes('pre college') || t.includes('program')) return 'Program';
  if (t.includes('class') || t.includes('course') || t.includes('workshop')) return 'Course';
  return humanize(record.opportunity_type).split(/[\s/(,]/)[0] || '—';
}

type Filters = { grade: string | null; type: string | null; format: string | null };

const GRADES = ['9', '10', '11', '12'];
const TYPES = ['Internship', 'Competition', 'Research', 'Scholarship', 'Summer'];
const FORMATS: Array<{ label: string; match: (r: DatabaseRecord) => boolean }> = [
  { label: 'Remote', match: (r) => /remote|online|virtual/i.test(r.program_format ?? '') },
  { label: 'In person', match: (r) => /in.?person|on.?site|campus/i.test(r.program_format ?? '') },
];

function applyFilters(records: DatabaseRecord[], f: Filters): DatabaseRecord[] {
  return records.filter((r) => {
    if (f.grade) {
      const g = gradeLabel(r.eligible_grades);
      // Rows with no grade data stay visible: unknown is not "no".
      if (g && !new RegExp(`(^|\\D)${f.grade}(\\D|$)`).test(g)) return false;
    }
    if (f.type && shortType(r) !== f.type) return false;
    if (f.format) {
      const fmt = FORMATS.find((x) => x.label === f.format);
      if (fmt && r.program_format && !fmt.match(r)) return false;
    }
    return true;
  });
}

/* ---------------------------------------------------------------------------
 * Flaps
 * ------------------------------------------------------------------------- */

/** Arms a data attribute on mount and whenever `value` changes, so CSS plays
 * the flip: new rows flap in, changed cells flap over. */
function useFlip(value: string): boolean {
  const prev = useRef(value);
  const [flip, setFlip] = useState(true);
  useEffect(() => {
    const changed = prev.current !== value;
    prev.current = value;
    if (changed) setFlip(true);
    const t = window.setTimeout(() => setFlip(false), 900);
    return () => window.clearTimeout(t);
  }, [value]);
  return flip;
}

/** One character per tile. Fixed-width words only (dates, statuses). */
export function FlapWord({ text, tone, size = 15, width }: { text: string; tone?: Tone; size?: number; width: number }) {
  const padded = text.toUpperCase().padEnd(width).slice(0, width);
  const flip = useFlip(padded);
  return (
    <span className="flap-word" data-tone={tone} style={{ ['--fs' as string]: `${size}px` }} aria-label={text.trim()}>
      {Array.from(padded).map((ch, k) => (
        <span key={k} className="flap" data-flip={flip ? '' : undefined} data-blank={ch === ' ' ? '' : undefined} style={{ ['--k' as string]: k }} aria-hidden="true">
          <span>{ch === ' ' ? ' ' : ch}</span>
        </span>
      ))}
    </span>
  );
}

/** Proportional text that flips as one plate when it changes. */
function FlapText({ text, className }: { text: string; className: string }) {
  const flip = useFlip(text);
  return (
    <span className={`flap-text ${className}`} data-flip={flip ? '' : undefined} title={text}>
      {text}
    </span>
  );
}

/* ---------------------------------------------------------------------------
 * Clock
 * ------------------------------------------------------------------------- */

export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Clock() {
  const now = useNow(1000);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <span className="font-board tnum text-[15px] font-semibold text-[var(--flap-text)]" aria-label={`Local time ${hh}:${mm}`}>
      {hh}
      <span className="blink">:</span>
      {mm}
    </span>
  );
}

export function relativeUpdated(value: string | null, now: Date): string {
  const d = parseDate(value);
  if (!d) return 'updated —';
  const mins = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60_000));
  if (mins < 60) return `updated ${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 48) return `updated ${h}h ago`;
  return `updated ${Math.round(h / 24)}d ago`;
}

/* ---------------------------------------------------------------------------
 * Board
 * ------------------------------------------------------------------------- */

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: BOARD_ROWS }).map((_, i) => (
        <div key={i} className="board-row board-grid" aria-hidden="true">
          <span className="board-skel w-[5.5rem]" />
          <span className="board-skel w-[60%]" />
          <span className="board-skel col-org w-[45%]" />
          <span className="board-skel col-type w-[4rem]" />
          <span className="board-skel w-[3.5rem]" />
        </div>
      ))}
    </>
  );
}

export function DeparturesBoard() {
  const board = useQuery({ queryKey: ['board'], queryFn: fetchBoard, staleTime: 5 * 60 * 1000 });
  const stats = useQuery({ queryKey: ['opportunity-stats'], queryFn: () => fetchOpportunityStats(), staleTime: 5 * 60 * 1000 });
  const now = useNow(60_000);
  const [filters, setFilters] = useState<Filters>({ grade: null, type: null, format: null });
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const saved = useMyBoard();
  const [, navigate] = useLocation();

  const matching = useMemo(() => (board.data ? applyFilters(board.data.records, filters) : []), [board.data, filters]);
  const pageCount = Math.max(1, Math.ceil(matching.length / BOARD_ROWS));
  const safePage = Math.min(page, pageCount - 1);
  const rows = useMemo(() => matching.slice(safePage * BOARD_ROWS, safePage * BOARD_ROWS + BOARD_ROWS), [matching, safePage]);
  const filtered = matching.length;

  // Auto-page like a real board: every PAGE_MS, unless the visitor is reading
  // (pointer over the board), paused it, or prefers reduced motion.
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cycling = !paused && !hovering && !reduceMotion && pageCount > 1 && Boolean(board.data);
  useEffect(() => {
    if (!cycling) return;
    const id = window.setInterval(() => setPage((p) => (p + 1) % pageCount), PAGE_MS);
    return () => window.clearInterval(id);
  }, [cycling, pageCount]);
  useEffect(() => setPage(0), [filters]);

  const toggleSave = (r: DatabaseRecord) => {
    if (myBoard.has(r.id)) {
      const gone = myBoard.remove(r.id);
      if (gone) toast('Removed from your board', { description: gone.title, action: { label: 'Undo', onClick: () => myBoard.restore(gone) } });
      return;
    }
    myBoard.add({ id: r.id, title: r.title ?? 'Untitled opportunity', organization: r.organization, deadline: r.application_deadline, type: shortType(r), path: recordPath(r) });
    setJustSaved(r.id);
    window.setTimeout(() => setJustSaved((cur) => (cur === r.id ? null : cur)), 1100);
    toast('Added to your board', {
      description: r.title ?? undefined,
      action: { label: 'Open board', onClick: () => myBoard.setDrawer(true) },
    });
  };
  const total = stats.data?.totalActive ?? board.data?.total ?? null;
  const anyFilter = Boolean(filters.grade || filters.type || filters.format);

  const toggle = (key: keyof Filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: f[key] === value ? null : value }));

  // Rows keep their identity across a filter change and slide to their new
  // slot (spatial consistency). Apple-style spring, no bounce, well under 500ms.
  const reduce = useReducedMotion();
  const rowTransition = reduce ? { duration: 0 } : { type: 'spring' as const, duration: 0.42, bounce: 0 };

  return (
    <section aria-labelledby="board-heading">
      <div
        className="board dark"
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        onFocusCapture={() => setHovering(true)}
        onBlurCapture={() => setHovering(false)}
      >
        {/* Header strip */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 pb-3 pt-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="board-heading" className="font-board text-[30px] font-bold leading-none tracking-[0.04em] text-[var(--flap-amber)] sm:text-[34px]">
              Departures
            </h2>
            <span className="font-board tnum whitespace-nowrap text-[16px] font-semibold text-[var(--flap-text)]">
              {total !== null ? `${total.toLocaleString()} listings` : <span className="board-skel inline-block w-[7rem] align-middle" />}
            </span>
            <span className="inline-flex items-center gap-1.5 font-board text-[12px] font-bold tracking-[0.14em] text-[var(--signal-green)]">
              <span className="live-dot" aria-hidden="true" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-5 text-[12.5px] text-[var(--flap-dim)]">
            <span className="tnum hidden sm:inline">{stats.data ? relativeUpdated(stats.data.lastUpdated, now) : 'checking…'}</span>
            <Clock />
          </div>
        </div>
        {/* The paging line: a real board flips pages on a timer. */}
        <div className="board-pager" data-cycling={cycling ? '' : undefined} style={{ ['--page-ms' as string]: `${PAGE_MS}ms` }} key={`${safePage}-${cycling}`}>
          <span className="board-pager-fill" aria-hidden="true" />
        </div>

        {/* Column heads */}
        <div className="board-grid border-t border-[rgba(244,239,226,0.14)] px-5 py-2 font-board text-[11.5px] font-semibold tracking-[0.14em] text-[var(--flap-dim)]" aria-hidden="true">
          <span>Deadline</span>
          <span>Program</span>
          <span className="col-org">Organization</span>
          <span className="col-type">Type</span>
          <span>Status</span>
        </div>

        {/* Rows */}
        <LayoutGroup id="board">
        <div role="list" aria-live="polite" aria-busy={board.isLoading}>
          {board.isLoading && <SkeletonRows />}
          {board.isError && (
            <p className="border-t border-[rgba(244,239,226,0.07)] px-5 py-8 text-center text-[14px] text-[var(--flap-dim)]">
              The board could not load. <Link href="/database" className="text-[var(--flap-text)] underline">Open the database instead.</Link>
            </p>
          )}
          {board.data && rows.length === 0 && (
            <p className="border-t border-[rgba(244,239,226,0.07)] px-5 py-8 text-center text-[14px] text-[var(--flap-dim)]">
              Nothing on the next {BOARD_FETCH} departures matches those filters.{' '}
              <button type="button" onClick={() => setFilters({ grade: null, type: null, format: null })} className="press text-[var(--flap-text)] underline">
                Clear them
              </button>
            </p>
          )}
          <AnimatePresence initial={false}>
          {rows.map((r, i) => {
            const status = statusOf(r, now);
            const org = r.organization ?? '—';
            const grades = gradeLabel(r.eligible_grades);
            const sub = [grades ? `Grades ${grades}` : null, r.location].filter(Boolean).join(' · ');
            return (
              <motion.div
                key={r.id}
                layout="position"
                initial={false}
                exit={{ opacity: 0, transition: { duration: 0.16 } }}
                transition={rowTransition}
                className="relative"
              >
              <button
                type="button"
                className="save-btn press"
                aria-pressed={saved.items.some((x) => x.id === r.id)}
                aria-label={saved.items.some((x) => x.id === r.id) ? `Remove ${r.title ?? 'this'} from your board` : `Save ${r.title ?? 'this'} to your board`}
                onClick={(e) => {
                  e.preventDefault();
                  toggleSave(r);
                }}
              >
                {saved.items.some((x) => x.id === r.id) ? <Check className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
              </button>
              {justSaved === r.id && (
                <span className="stamp" aria-hidden="true">
                  Saved
                </span>
              )}
              <Link
                href={recordPath(r)}
                role="listitem"
                className="board-row board-grid"
                style={{ ['--i' as string]: i }}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                  e.preventDefault();
                  openWithTransition(navigate, recordPath(r), e.currentTarget.querySelector('.board-title'), r.title);
                }}
              >
                <span className="flex flex-col gap-1.5">
                  <FlapWord text={deadlineFlaps(r)} width={6} size={19} tone={status.tone === 'yellow' ? 'yellow' : 'amber'} />
                  <span className="board-sub tnum">{daysLine(r, now)}</span>
                </span>
                <span className="min-w-0">
                  <FlapText text={r.title ?? 'Untitled opportunity'} className="board-title" />
                  <span className="board-sub mt-0.5 block sm:hidden">{org}</span>
                  {sub && <span className="board-sub mt-0.5 hidden sm:block">{sub}</span>}
                </span>
                <span className="col-org min-w-0">
                  <FlapText text={org} className="board-sub !text-[13.5px] !text-[var(--flap-text)] opacity-90" />
                </span>
                <span className="col-type">
                  <FlapText text={shortType(r)} className="board-sub !text-[13px]" />
                </span>
                <span>
                  <FlapWord text={status.text} width={7} tone={status.tone} size={14} />
                </span>
              </Link>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
        </LayoutGroup>

        {/* Footer strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(244,239,226,0.14)] px-5 py-3 text-[12.5px] text-[var(--flap-dim)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button type="button" className="pager-btn press" onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)} aria-label="Previous page" disabled={pageCount < 2}>
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button type="button" className="pager-btn press" onClick={() => setPage((p) => (p + 1) % pageCount)} aria-label="Next page" disabled={pageCount < 2}>
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
              <button type="button" className="pager-btn press" onClick={() => setPaused((v) => !v)} aria-label={paused ? 'Resume auto-paging' : 'Pause auto-paging'} aria-pressed={paused} disabled={pageCount < 2}>
                {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
              </button>
            </div>
            <span className="tnum">
              {board.data ? (
                <>
                  <span className="font-board text-[13px] font-bold tracking-[0.1em] text-[var(--flap-text)]">Page {safePage + 1} / {pageCount}</span>
                  <span className="hidden sm:inline">
                    {' · '}
                    {anyFilter ? `${filtered} matching the next ${BOARD_FETCH}` : `the next ${Math.min(matching.length, BOARD_FETCH)} of ${board.data.total.toLocaleString()} by deadline`}
                  </span>
                </>
              ) : ' '}
            </span>
          </div>
          <Link href="/database" className="press inline-flex items-center gap-1.5 font-medium text-[var(--flap-text)]">
            Full database <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Filters live in the hall, under the board, like the touchscreen kiosk. */}
      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
        <FilterGroup label="Grade">
          {GRADES.map((g) => (
            <button key={g} type="button" className="chip press" aria-pressed={filters.grade === g} onClick={() => toggle('grade', g)}>
              {g}th
            </button>
          ))}
        </FilterGroup>
        <FilterGroup label="Type">
          {TYPES.map((t) => (
            <button key={t} type="button" className="chip press" aria-pressed={filters.type === t} onClick={() => toggle('type', t)}>
              {t}
            </button>
          ))}
        </FilterGroup>
        <FilterGroup label="Format">
          {FORMATS.map((f) => (
            <button key={f.label} type="button" className="chip press" aria-pressed={filters.format === f.label} onClick={() => toggle('format', f.label)}>
              {f.label}
            </button>
          ))}
        </FilterGroup>
      </div>
    </section>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Filter by ${label.toLowerCase()}`}>
      <span className="mr-1 text-[12.5px] font-medium uppercase tracking-[0.08em] text-[var(--ink-muted)]">{label}</span>
      {children}
    </div>
  );
}
