import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ArrowUpRight, BadgeCheck, TriangleAlert } from 'lucide-react';
import { LiveStats } from '@/components/home/LiveStats';
import { DONUT_COLORS, DonutLegend, ScoreDonut } from '@/components/ScoreDonut';
import type { ChatTurn } from '@/components/chat/MessageBubble';
import type { OpportunityMatch } from '@/lib/ask-stempath';
import { opportunityPath } from '@/lib/seo';

/** Subtle on-scroll reveal. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.14 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`${className ?? ''} transition-all duration-700 ${shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
      style={{ transitionTimingFunction: 'var(--ease-out)' }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="font-annotation text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{children}</span>
  );
}

/** Section 5 — live database proof that research happens before the student arrives. */
export function DatabaseProof() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto w-full max-w-[var(--story-width)]">
        <Reveal>
          <Eyebrow>Live database</Eyebrow>
          <h2 className="font-display mt-3 max-w-[720px] text-[26px] font-[620] leading-[1.12] tracking-[-0.02em] text-foreground sm:text-[34px]">
            These opportunities were researched and structured before you arrived — not generated when you asked.
          </h2>
          <div className="mt-8 max-w-[620px]">
            <LiveStats />
          </div>
          <Link
            href="/database"
            className="mt-5 inline-flex items-center gap-2 text-[14px] text-primary underline-offset-4 hover:underline"
          >
            Browse the database
            <ArrowRight className="size-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/** Section 6 — why I built this. */
export function WhyIBuilt() {
  return (
    <section id="why" className="border-t border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto w-full max-w-[var(--content-width)]">
        <Reveal>
          <Eyebrow>Why I built this</Eyebrow>
          <h2 className="font-display mt-3 text-[28px] font-[620] leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[40px]">
            Real opportunities are scattered and hard to trust.
          </h2>
          <div className="mt-6 space-y-4 text-[16px] leading-[1.7] text-secondary-foreground/90">
            <p className="text-[var(--brand-muted-1)]">
              The programs that actually help students — research placements, competitions, summer
              intensives, scholarships — live on hundreds of separate official websites. Aggregators
              paper over that with crowdsourced lists full of dead links and invented deadlines.
            </p>
            <p className="text-[var(--brand-muted-1)]">
              I wanted the opposite: something that does the research first, keeps only what it can
              verify from the source, and shows a student the handful of opportunities they are
              actually eligible for — with a plain explanation of why each one fits.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const STEPS: Array<{ n: string; title: string; body: string }> = [
  {
    n: '01',
    title: 'Research runs on a schedule',
    body: 'A scheduled job uses Exa to discover real opportunities from official public websites — before any student searches.',
  },
  {
    n: '02',
    title: 'Each opportunity is structured once',
    body: 'A language model condenses each opportunity into one consistent, structured record: grades, deadlines, cost, eligibility, links.',
  },
  {
    n: '03',
    title: 'Records are stored and reused',
    body: 'Those structured records sit in a database, ready to be retrieved — the research cost is paid once, not per question.',
  },
  {
    n: '04',
    title: 'Your search retrieves only what fits',
    body: 'When you search, the system pulls the relevant records, checks them against your grade and eligibility, and keeps a small, ranked set.',
  },
  {
    n: '05',
    title: 'The matches are explained',
    body: 'Only then does a language model read that small set and explain why each one fits you. It never invents opportunities, deadlines, or links.',
  },
];

/** Section 7 — how the system works (the core differentiator, factual). */
export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto w-full max-w-[var(--story-width)]">
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
          <h2 className="font-display mt-3 max-w-[760px] text-[28px] font-[620] leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[40px]">
            A chatbot generates an answer from your prompt. This researches first, then explains what
            it already found.
          </h2>
        </Reveal>

        <div className="mt-12 border-t border-border">
          {STEPS.map((step) => (
            <Reveal key={step.n}>
              <div className="grid grid-cols-1 gap-2 border-b border-border py-7 sm:grid-cols-[80px_1fr] sm:gap-8">
                <span className="font-annotation text-[13px] text-muted-foreground">{step.n}</span>
                <div className="max-w-[720px]">
                  <h3 className="font-display text-[18px] font-semibold text-foreground sm:text-[20px]">{step.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-[1.65] text-[var(--brand-muted-1)]">{step.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const EVOLUTION: Array<{ from: string; to: string }> = [
  {
    from: 'Explored the look quickly in a visual prototyping tool.',
    to: 'Moved into a real development environment to build the actual product and data pipeline.',
  },
  {
    from: 'First version sent the whole opportunity database to the model for every question.',
    to: 'Now it retrieves only relevant records and checks eligibility first, so the model reads a small, focused set.',
  },
  {
    from: 'Started as a single free-text question.',
    to: 'Added an optional 30-second profile so vague questions still return useful, eligible matches.',
  },
];

/** Section 8 — how the product evolved. */
export function HowItEvolved() {
  return (
    <section id="evolved" className="border-t border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto w-full max-w-[var(--content-width)]">
        <Reveal>
          <Eyebrow>How it evolved</Eyebrow>
          <h2 className="font-display mt-3 text-[28px] font-[620] leading-[1.1] tracking-[-0.025em] text-foreground sm:text-[40px]">
            It got simpler for you as it got stricter underneath.
          </h2>
        </Reveal>
        <div className="mt-10 space-y-8">
          {EVOLUTION.map((row, i) => (
            <Reveal key={i}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-8">
                <p className="text-[15px] leading-[1.6] text-muted-foreground line-through decoration-[var(--brand-muted-4)]">
                  {row.from}
                </p>
                <p className="text-[15px] leading-[1.6] text-foreground">{row.to}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const DIFFERENCE: Array<{ chatbot: string; ours: string }> = [
  {
    chatbot: 'Starts from your prompt and generates an answer on the spot.',
    ours: 'Researches real opportunities from official sources ahead of time, on a schedule.',
  },
  {
    chatbot: 'Can invent opportunities, deadlines, and links that don’t exist.',
    ours: 'Only shows opportunities researched and verified from their official source.',
  },
  {
    chatbot: 'Has no lasting database — every answer is regenerated from scratch.',
    ours: 'Stores each opportunity once as a structured, reusable record.',
  },
  {
    chatbot: 'Answers everyone the same way from the same prompt.',
    ours: 'Retrieves only the records relevant to you and checks your eligibility first.',
  },
  {
    chatbot: 'The model is the source of the answer.',
    ours: 'The model only explains the matches it’s given — never the source of the facts.',
  },
];

/** How STEMPath Finder differs from a general chatbot like ChatGPT (factual). */
export function Difference() {
  return (
    <section id="different" className="border-t border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto w-full max-w-[var(--story-width)]">
        <Reveal>
          <Eyebrow>How we’re different</Eyebrow>
          <h2 className="font-display mt-3 max-w-[820px] text-[28px] font-[640] leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[40px]">
            Unlike ChatGPT, STEMPath Finder compares your search against a database it built first.
          </h2>
          <p className="mt-5 max-w-[720px] text-[16px] leading-[1.7] text-[var(--brand-muted-1)]">
            ChatGPT generates an answer from your prompt on the spot. STEMPath Finder researches real
            opportunities from official sources ahead of time, stores them as structured records, and
            compares your search against that database — so every match is a real, verified program,
            never an invented one.
          </p>
        </Reveal>

        <div className="mt-12 hidden grid-cols-2 gap-10 border-b border-border pb-3 sm:grid">
          <span className="font-annotation text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
            A general chatbot (e.g. ChatGPT)
          </span>
          <span className="font-annotation text-[12px] uppercase tracking-[0.14em] text-foreground">
            STEMPath Finder
          </span>
        </div>

        <div className="border-t border-border sm:border-t-0">
          {DIFFERENCE.map((row, i) => (
            <Reveal key={i}>
              <div className="grid grid-cols-1 gap-2 border-b border-border py-6 sm:grid-cols-2 sm:gap-10">
                <div>
                  <span className="font-annotation text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:hidden">
                    Chatbot
                  </span>
                  <p className="text-[15px] leading-[1.6] text-muted-foreground line-through decoration-[var(--brand-muted-4)]">
                    {row.chatbot}
                  </p>
                </div>
                <div>
                  <span className="font-annotation text-[10px] uppercase tracking-[0.14em] text-foreground sm:hidden">
                    STEMPath Finder
                  </span>
                  <p className="text-[15px] leading-[1.6] text-foreground">{row.ours}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---- Results (section 9): editorial list, not chat bubbles ----

const STATUS_TONE: Record<string, string> = {
  open: 'text-[var(--brand-success)] border-[var(--brand-success)]/40',
  upcoming: 'text-[var(--brand-warning)] border-[var(--brand-warning)]/40',
  closed: 'text-[var(--brand-error)] border-[var(--brand-error)]/40',
};

const PRIORITY_DISPLAY: Record<string, { label: string; tone: string }> = {
  'apply-now': { label: 'Apply now', tone: 'text-[var(--brand-error)] border-[var(--brand-error)]/40' },
  'apply-soon': { label: 'Apply soon', tone: 'text-[var(--brand-warning)] border-[var(--brand-warning)]/40' },
  open: { label: 'Open', tone: 'text-[var(--brand-success)] border-[var(--brand-success)]/40' },
  watchlist: { label: 'Watchlist', tone: 'text-[var(--brand-muted-1)] border-border' },
  'verify-first': { label: 'Verify first', tone: 'text-[var(--brand-warning)] border-[var(--brand-warning)]/40' },
  closed: { label: 'Closed', tone: 'text-[var(--brand-error)] border-[var(--brand-error)]/40' },
};

const COMPETITIVENESS_LABEL: Record<string, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very-high': 'Very high',
  unknown: 'Unknown',
};

/** Transparent grade strip: the grade donut (hover a slice for its exact
 * points), each section traceable to its criteria in the expandable
 * breakdown below — never one opaque number. */
function RankingStrip({ ranking }: { ranking: NonNullable<OpportunityMatch['ranking']> }) {
  const priority = PRIORITY_DISPLAY[ranking.applicationPriority.label];
  const grade = ranking.courseGrade;
  const breakdowns: Array<{ title: string; dim: { components: Array<{ label: string; points: number; maxPoints: number; reason: string; evidence?: string }> } }> = [
    { title: 'Course Completion (30%)', dim: grade.courseCompletion },
    { title: 'Challenge Performance (40%)', dim: grade.challengePerformance },
    { title: 'Final Project (30%)', dim: grade.finalProject },
    { title: 'Personal fit (not graded)', dim: ranking.personalFit },
  ];

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-4">
        <ScoreDonut
          size={76}
          center={ranking.orderingScore}
          centerCaption="total"
          segments={[
            {
              key: 'completion',
              label: 'Course Completion',
              color: DONUT_COLORS.completion,
              points: grade.courseCompletion.graded ? grade.courseCompletion.points : null,
              maxPoints: grade.courseCompletion.maxPoints,
              detail: grade.courseCompletion.ungradedReason,
            },
            {
              key: 'challenge',
              label: 'Challenge Performance',
              color: DONUT_COLORS.challenge,
              points: grade.challengePerformance.graded ? grade.challengePerformance.points : null,
              maxPoints: grade.challengePerformance.maxPoints,
              detail: grade.challengePerformance.ungradedReason,
            },
            {
              key: 'final',
              label: 'Final Project',
              color: DONUT_COLORS.final,
              points: grade.finalProject.graded ? grade.finalProject.points : null,
              maxPoints: grade.finalProject.maxPoints,
              detail: grade.finalProject.ungradedReason,
            },
          ]}
        />
        <div className="flex flex-col items-start gap-1.5">
          {priority && (
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${priority.tone}`}>
              {priority.label}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground">
            Competitiveness: {COMPETITIVENESS_LABEL[ranking.competitiveness.tier] ?? 'Unknown'}
          </span>
          <DonutLegend
            items={[
              { label: 'Completion', color: DONUT_COLORS.completion, pct: 30 },
              { label: 'Challenge', color: DONUT_COLORS.challenge, pct: 40 },
              { label: 'Final Project', color: DONUT_COLORS.final, pct: 30 },
            ]}
          />
        </div>
      </div>

      <details className="mt-2 group">
        <summary className="cursor-pointer list-none font-annotation text-[11px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground">
          Why these scores <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>
        </summary>
        <div className="mt-2 space-y-3 rounded-[8px] border border-border bg-white/[0.02] p-3">
          <p className="text-[12px] text-[var(--brand-muted-1)]">{ranking.applicationPriority.reason}</p>
          {breakdowns.map(({ title, dim }) =>
            dim.components.length > 0 ? (
              <div key={title}>
                <p className="font-annotation text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
                <ul className="mt-1 space-y-0.5">
                  {dim.components.map((c) => (
                    <li key={`${title}-${c.label}`} className="text-[12px] leading-[1.5] text-[var(--brand-muted-1)]">
                      <span className="tabular-nums text-foreground/70">{c.points}/{c.maxPoints}</span> {c.label} — {c.reason}
                      {c.evidence && <span className="text-muted-foreground"> “{c.evidence}”</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
          {ranking.competitiveness.factors.length > 0 && (
            <div>
              <p className="font-annotation text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Competitiveness</p>
              <ul className="mt-1 space-y-0.5">
                {ranking.competitiveness.factors.map((f) => (
                  <li key={f} className="text-[12px] leading-[1.5] text-[var(--brand-muted-1)]">{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}

function metaLine(m: OpportunityMatch): string {
  const grades = Array.isArray(m.eligible_grades) ? m.eligible_grades.join(', ') : m.eligible_grades ?? '';
  return [m.opportunity_type, grades ? `Grades ${grades}` : '', m.location, m.cost, m.deadline ? `Deadline ${m.deadline}` : '']
    .filter(Boolean)
    .join('  ·  ');
}

function ResultItem({ m }: { m: OpportunityMatch }) {
  const link = m.official_url || m.application_url || undefined;
  const tone = m.application_status ? STATUS_TONE[m.application_status] : undefined;
  return (
    <div className="border-t border-border py-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-display text-[18px] font-semibold leading-snug text-foreground">
            {link ? (
              <a href={link} target="_blank" rel="noreferrer noopener" className="inline-flex items-start gap-1 hover:underline">
                {m.title ?? 'Untitled opportunity'}
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              </a>
            ) : (
              (m.title ?? 'Untitled opportunity')
            )}
          </h3>
          {m.organization && <p className="mt-0.5 text-[13px] text-muted-foreground">{m.organization}</p>}
        </div>
        {m.application_status && (
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${tone ?? 'border-border text-muted-foreground'}`}>
            {m.application_status}
          </span>
        )}
      </div>

      <p className="mt-3 font-annotation text-[12px] text-[var(--brand-muted-3)]">{metaLine(m)}</p>

      {m.title && (
        <p className="mt-1.5">
          <Link
            href={opportunityPath(m.title, m.id)}
            className="text-[13px] text-primary underline-offset-4 hover:underline"
          >
            View details on STEMPath Finder
          </Link>
        </p>
      )}

      {m.match_reason && (
        <p className="mt-3 max-w-[680px] text-[14px] leading-[1.6] text-[var(--brand-muted-1)]">
          <span className="text-foreground/80">Why it fits — </span>
          {m.match_reason}
        </p>
      )}

      {m.eligibility_warning && (
        <p className="mt-2 flex items-start gap-1.5 text-[13px] text-[var(--brand-warning)]">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {m.eligibility_warning}
        </p>
      )}

      {m.ranking && <RankingStrip ranking={m.ranking} />}

      {m.verified_at && (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--brand-success)]">
          <BadgeCheck className="size-3.5" /> Verified from source
        </p>
      )}
    </div>
  );
}

export interface ResultsProps {
  turn: ChatTurn;
  query: string;
  followUp: string;
  onFollowUpChange: (v: string) => void;
  onFollowUp: () => void;
  onNewSearch: () => void;
  isLoading: boolean;
}

export function Results({ turn, query, followUp, onFollowUpChange, onFollowUp, onNewSearch, isLoading }: ResultsProps) {
  const matches = turn.matches ?? [];
  return (
    <section id="results" className="scroll-mt-24 border-t border-border px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto w-full max-w-[var(--content-width)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>Results</Eyebrow>
          <button
            type="button"
            onClick={onNewSearch}
            className="rounded-[var(--radius-button)] border border-border px-3 py-1.5 text-[13px] text-foreground transition-colors hover:bg-accent"
          >
            New search
          </button>
        </div>

        {query && <p className="mt-4 text-[13px] text-muted-foreground">You searched — {query}</p>}

        {turn.content && (
          <p className="mt-3 max-w-[720px] text-[16px] leading-[1.7] text-foreground">{turn.content}</p>
        )}

        {turn.clarificationQuestion && (
          <p className="mt-3 max-w-[720px] border-l-2 border-border pl-4 text-[15px] text-[var(--brand-muted-1)]">
            {turn.clarificationQuestion}
          </p>
        )}

        {matches.length > 0 ? (
          <div className="mt-6">
            {matches.map((m) => (
              <ResultItem key={m.id} m={m} />
            ))}
          </div>
        ) : (
          !turn.isError && <p className="mt-6 text-[14px] text-muted-foreground">No matching opportunities in the database yet for this search.</p>
        )}

        <div className="mt-8 flex items-end gap-2">
          <textarea
            value={followUp}
            onChange={(e) => onFollowUpChange(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onFollowUp();
              }
            }}
            rows={1}
            placeholder="Refine or ask a follow-up…"
            aria-label="Refine or ask a follow-up"
            className="min-h-[44px] flex-1 resize-none rounded-[var(--radius-medium,11px)] border border-border bg-[var(--surface-1)] px-3.5 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[var(--brand-border-active)]"
          />
          <button
            type="button"
            onClick={onFollowUp}
            disabled={isLoading || !followUp.trim()}
            className="h-[44px] shrink-0 rounded-[var(--radius-button)] bg-primary px-4 text-[13px] font-bold text-primary-foreground transition-transform hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? 'Searching…' : 'Send'}
          </button>
        </div>

        <p className="mt-3 font-annotation text-[12px] text-[var(--brand-muted-3)]">This session is not saved.</p>
      </div>
    </section>
  );
}

/** Marketing hero for the Home page (not the search — that lives on /find). */
export function HomeHero() {
  return (
    <section className="relative px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28">
      <div className="relative mx-auto max-w-[880px] text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-10 -top-16 bottom-0 -z-[1]"
          style={{ background: 'radial-gradient(78% 55% at 50% 30%, rgba(7,8,9,0.94), rgba(7,8,9,0.55) 55%, transparent 82%)' }}
        />
        <span className="font-annotation text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Researched before you arrive
        </span>
        <h1 className="font-display mx-auto mt-5 max-w-[820px] text-[42px] font-[680] leading-[0.98] tracking-[-0.04em] text-foreground sm:text-[68px] lg:text-[80px]">
          Find the STEM path that&apos;s actually yours.
        </h1>
        <p className="mx-auto mt-6 max-w-[600px] text-[17px] leading-[1.6] text-[var(--brand-muted-1)]">
          A researched database of real STEM opportunities for grades 6–12 — competitions, research,
          internships, camps, scholarships — matched to you, not generated on the spot.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/find"
            className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-6 py-3 text-[15px] font-bold text-primary-foreground transition-transform hover:-translate-y-px"
          >
            Find your matches
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/how"
            className="liquid-glass inline-flex items-center gap-2 rounded-[var(--radius-button)] px-6 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-white/10"
          >
            How it works
          </Link>
        </div>
        {/* Backs up the "researched before you arrive" claim with the actual counts. */}
        <div className="mx-auto mt-10 max-w-[620px] text-left">
          <LiveStats />
        </div>
      </div>
    </section>
  );
}

const INSPIRATION: Array<{ tag: string; title: string; body: string }> = [
  {
    tag: 'The itch',
    title: 'I wanted this to exist, so I built it.',
    body: 'I kept looking for a single place to find real STEM opportunities — and there wasn’t one worth trusting. So I decided to make the STEM opportunity finder I actually wanted to use.',
  },
  {
    tag: 'The difference',
    title: 'Verified and structured, not crowdsourced.',
    body: 'Most sites are stale, crowdsourced lists with dead links and invented deadlines. To be different, every opportunity here is researched from its official source and kept in one consistent, structured shape.',
  },
  {
    tag: 'The idea',
    title: 'Automate the research, then store it.',
    body: 'The unlock was automation: research and structure opportunities ahead of time and store them, so a search retrieves verified records instantly instead of asking a model to invent an answer.',
  },
];

/** Home inspiration story — why I'm interested and what makes this different. */
export function Inspiration() {
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto w-full max-w-[var(--story-width)]">
        <Reveal>
          <Eyebrow>The inspiration</Eyebrow>
          <h2 className="font-display mt-3 max-w-[760px] text-[28px] font-[640] leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[40px]">
            Why I&apos;m building STEMPath Finder.
          </h2>
        </Reveal>
        <div className="mt-12 border-t border-border">
          {INSPIRATION.map((row) => (
            <Reveal key={row.tag}>
              <div className="grid grid-cols-1 gap-2 border-b border-border py-8 sm:grid-cols-[160px_1fr] sm:gap-10">
                <span className="font-annotation text-[12px] uppercase tracking-[0.14em] text-muted-foreground">{row.tag}</span>
                <div className="max-w-[720px]">
                  <h3 className="font-display text-[20px] font-semibold leading-snug text-foreground sm:text-[24px]">{row.title}</h3>
                  <p className="mt-2 text-[15px] leading-[1.7] text-[var(--brand-muted-1)]">{row.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Closing call-to-action band. */
export function CtaBand() {
  return (
    <section className="border-t border-border px-4 py-20 sm:px-6 sm:py-28">
      <Reveal className="mx-auto max-w-[var(--content-width)] text-center">
        <h2 className="font-display text-[30px] font-[660] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[46px]">
          Ready to see what fits you?
        </h2>
        <Link
          href="/find"
          className="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-primary px-7 py-3.5 text-[15px] font-bold text-primary-foreground transition-transform hover:-translate-y-px"
        >
          Find your matches
          <ArrowRight className="size-4" />
        </Link>
        <p className="mt-4 font-annotation text-[12px] text-[var(--brand-muted-3)]">No sign-in required · This session is not saved.</p>
      </Reveal>
    </section>
  );
}

/** What students can find here — visible, crawlable copy with category links. */
export function WhatYouCanFind() {
  const categories: Array<{ label: string; href: string }> = [
    { label: 'Summer internships', href: '/summer-internships' },
    { label: 'Research opportunities', href: '/research-programs' },
    { label: 'Coding programs', href: '/computer-science-opportunities' },
    { label: 'Engineering programs', href: '/engineering-opportunities' },
    { label: 'Medical programs', href: '/medical-opportunities' },
    { label: 'Robotics opportunities', href: '/robotics-opportunities' },
    { label: 'Science competitions', href: '/science-competitions' },
    { label: 'Volunteering', href: '/volunteer-opportunities' },
    { label: 'Paid internships', href: '/paid-internships' },
    { label: 'Free summer programs', href: '/free-summer-programs' },
  ];
  return (
    <section className="border-t border-border px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto w-full max-w-[var(--story-width)]">
        <Reveal>
          <Eyebrow>What you can find</Eyebrow>
          <h2 className="font-display mt-3 max-w-[760px] text-[26px] font-[620] leading-[1.12] tracking-[-0.02em] text-foreground sm:text-[34px]">
            Summer internships and STEM opportunities for high school students.
          </h2>
          <p className="mt-5 max-w-[680px] text-[15px] leading-[1.7] text-[var(--brand-muted-1)]">
            STEMPath Finder helps students find summer internships, research opportunities, coding
            programs, engineering programs, medical programs, robotics opportunities, science
            competitions, volunteering, mentorships, and summer camps — each researched from its
            official source with eligibility, deadlines, and cost in one place.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {categories.map((category) => (
              <Link
                key={category.href}
                href={category.href}
                className="rounded-full border border-border px-3.5 py-1.5 text-[13px] text-foreground transition-colors hover:bg-accent"
              >
                {category.label}
              </Link>
            ))}
          </div>
          <p className="mt-6 text-[14px] text-[var(--brand-muted-1)]">
            Browse by place or grade:{' '}
            <Link href="/locations/houston" className="text-primary underline-offset-4 hover:underline">Houston</Link>,{' '}
            <Link href="/locations/texas" className="text-primary underline-offset-4 hover:underline">Texas</Link>,{' '}
            <Link href="/locations/remote" className="text-primary underline-offset-4 hover:underline">remote programs</Link>,{' '}
            <Link href="/opportunities-for-9th-graders" className="text-primary underline-offset-4 hover:underline">9th</Link>–
            <Link href="/opportunities-for-12th-graders" className="text-primary underline-offset-4 hover:underline">12th graders</Link>{' '}
            — or read the{' '}
            <Link href="/guides" className="text-primary underline-offset-4 hover:underline">student guides</Link>.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const FOOTER_COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: 'Opportunities',
    links: [
      { label: 'Summer Internships', href: '/summer-internships' },
      { label: 'Research Programs', href: '/research-programs' },
      { label: 'Coding Opportunities', href: '/computer-science-opportunities' },
      { label: 'Engineering Opportunities', href: '/engineering-opportunities' },
      { label: 'Medical Opportunities', href: '/medical-opportunities' },
      { label: 'Science Competitions', href: '/science-competitions' },
    ],
  },
  {
    heading: 'Browse',
    links: [
      { label: 'Houston Opportunities', href: '/locations/houston' },
      { label: 'Texas Opportunities', href: '/locations/texas' },
      { label: 'Remote Programs', href: '/locations/remote' },
      { label: 'Paid Internships', href: '/paid-internships' },
      { label: 'Free Summer Programs', href: '/free-summer-programs' },
      { label: 'Full Database', href: '/database' },
    ],
  },
  {
    heading: 'STEMPath Finder',
    links: [
      { label: 'About STEMPath Finder', href: '/how' },
      { label: 'Vs. ChatGPT', href: '/different' },
      { label: 'Student Guides', href: '/guides' },
      { label: 'Find Your Matches', href: '/find' },
      { label: 'Student Pathways', href: '/student-pathways' },
    ],
  },
];

/** Site-wide footer: major categories, locations, and about links. */
export function HomeFooter() {
  return (
    <footer className="border-t border-border px-4 py-12 sm:px-6">
      <div className="mx-auto grid w-full max-w-[var(--story-width)] grid-cols-1 gap-8 sm:grid-cols-3">
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <p className="font-annotation text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {column.heading}
            </p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-10 flex w-full max-w-[var(--story-width)] flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted-foreground">
          &copy; {new Date().getFullYear()} STEMPath Finder · No sign-in required · This session is not saved.
        </p>
        <div className="flex gap-5 text-[13px] text-muted-foreground">
          <Link href="/docs" className="transition-colors hover:text-foreground">Documentation</Link>
          <a href="/admin/login" className="transition-colors hover:text-foreground">Admin</a>
        </div>
      </div>
    </footer>
  );
}
