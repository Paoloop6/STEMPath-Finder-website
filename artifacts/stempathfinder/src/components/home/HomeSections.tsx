import { useEffect, useRef, useState, type ReactNode } from 'react';
import type React from 'react';
import { Link } from 'wouter';
import { ArrowRight, ArrowUpRight, BadgeCheck, TriangleAlert } from 'lucide-react';
import { DeparturesBoard, FlapWord, relativeUpdated, useNow } from '@/components/home/DeparturesBoard';
import { useQuery } from '@tanstack/react-query';
import { fetchOpportunityStats } from '@/lib/live-stats';
import { LiveStats } from '@/components/home/LiveStats';
import { DONUT_COLORS, DonutLegend, ScoreDonut } from '@/components/ScoreDonut';
import type { ChatTurn } from '@/components/chat/MessageBubble';
import type { OpportunityMatch } from '@/lib/ask-stempath';
import { opportunityPath } from '@/lib/seo';
import { HOME_H1, HOME_LEAD } from '@/lib/static-pages';

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
  const stats = useQuery({ queryKey: ['opportunity-stats'], queryFn: () => fetchOpportunityStats(), staleTime: 5 * 60 * 1000 });
  const now = useNow(60_000);
  const total = stats.data?.totalActive ?? null;
  // The sign's own words: HOME_H1 is prerendered verbatim; the plate wraps its last phrase.
  const cut = HOME_H1.lastIndexOf('sorted by');
  const lead = cut > 0 ? HOME_H1.slice(0, cut) : HOME_H1;
  const plate = cut > 0 ? HOME_H1.slice(cut) : '';
  return (
    <section className="px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-12">
      <div className="mx-auto w-full max-w-[var(--page-width)]">
        <h1 className="font-display text-[36px] font-[900] leading-[0.94] tracking-[-0.02em] text-foreground sm:text-[56px] lg:text-[64px] xl:text-[72px]">
          {lead}
          <br className="hidden lg:inline" />
          {plate && <span className="plate" data-wipe="">{plate}</span>}
        </h1>

        <div className="mt-7 grid grid-cols-1 items-end gap-x-12 gap-y-6 border-t border-[var(--hall-line-strong)] pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* The count is the proof, so it gets the sign's biggest lettering. */}
          <div className="hero-count">
            <div className="flex items-end gap-4">
              {total !== null ? (
                <FlapWord text={total.toLocaleString()} width={5} size={52} tone="amber" />
              ) : (
                <span className="skeleton-shimmer inline-block h-[80px] w-[16rem] rounded-[4px]" aria-hidden="true" />
              )}
            </div>
            <p className="mt-2.5 font-board text-[15px] font-bold tracking-[0.12em] text-[var(--ink)]">
              Listings on the board
              <span className="mx-2 text-[var(--ink-faint)]">·</span>
              <span className="text-[var(--ink-muted)]">{stats.data ? relativeUpdated(stats.data.lastUpdated, now) : 'checking'}</span>
            </p>
          </div>

          <div className="max-w-[48ch] lg:justify-self-end">
            <p className="text-[17px] leading-[1.5] text-[var(--ink-soft)] sm:text-[19px]">{HOME_LEAD}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/find" className="btn-slab press text-[16px] !px-6 !py-3.5">
                Find your matches
                <ArrowRight className="size-[18px]" aria-hidden="true" />
              </Link>
              <Link href="/how" className="btn-line press text-[16px] !px-6 !py-3.5">
                How records are made
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-9">
          <DeparturesBoard />
        </div>
      </div>
    </section>
  );
}

type Gate = { code: string; label: string; href: string; note: string };

const GATES: Gate[] = [
  { code: 'A1', label: 'Summer internships', href: '/summer-internships', note: 'Paid and unpaid placements at labs, companies, and universities.' },
  { code: 'A2', label: 'Research programs', href: '/research-programs', note: 'Mentored projects, often with a poster or paper at the end.' },
  { code: 'B1', label: 'Science competitions', href: '/science-competitions', note: 'Fairs, olympiads, and challenges with real judging.' },
  { code: 'B2', label: 'Coding programs', href: '/computer-science-opportunities', note: 'Software, data, and AI programs for beginners through advanced.' },
  { code: 'C1', label: 'Engineering programs', href: '/engineering-opportunities', note: 'Build-focused camps, robotics, and design challenges.' },
  { code: 'C2', label: 'Medical programs', href: '/medical-opportunities', note: 'Shadowing, hospital volunteering, and pre-med academies.' },
  { code: 'D1', label: 'Robotics', href: '/robotics-opportunities', note: 'Teams, leagues, and summer robotics intensives.' },
  { code: 'D2', label: 'Volunteering', href: '/volunteer-opportunities', note: 'Service hours with a STEM angle.' },
  { code: 'E1', label: 'Paid internships', href: '/paid-internships', note: 'Only listings whose record shows a stipend or wage.' },
  { code: 'E2', label: 'Free summer programs', href: '/free-summer-programs', note: 'Only listings whose record shows no cost.' },
];

/** Fires once when the element scrolls into view; instant under reduced motion. */
function useInViewOnce<T extends HTMLElement>(margin = '-80px'): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, seen];
}

/** The gates: every category is a sign you can walk to. Crawlable links. */
export function WhatYouCanFind() {
  const [listRef, seen] = useInViewOnce<HTMLUListElement>();
  return (
    <section className="band-deep border-t border-[var(--hall-line-strong)] px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="gates-heading">
      <div className="mx-auto w-full max-w-[var(--page-width)]">
        <div>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="gates-heading" className="font-display max-w-[14ch] text-[32px] font-[900] leading-[0.94] tracking-[-0.02em] text-foreground sm:text-[52px]">
              Pick a gate. Every one leads to real listings.
            </h2>
            <p className="max-w-[40ch] text-[15px] leading-[1.6] text-[var(--ink-muted)]">
              Summer internships, research, competitions, coding, engineering, medicine, robotics, volunteering, scholarships, and camps for grades 6–12, each read from its official source.
            </p>
          </div>
        </div>
        <div className="mt-10">
          <ul ref={listRef} className="grid grid-cols-1 border-b border-[var(--hall-line-strong)] md:grid-cols-2 md:gap-x-12">
            {GATES.map((g, i) => (
              <li key={g.href} className="reveal-row" data-visible={seen ? '' : undefined} style={{ ['--r' as string]: Math.floor(i / 2) }}>
                <Link href={g.href} className="gate press">
                  <span className="gate-code tnum" aria-hidden="true">{g.code}</span>
                  <span className="min-w-0">
                    <span className="gate-label font-board block text-[24px] font-bold leading-none tracking-[0.02em] text-foreground sm:text-[34px]">{g.label}</span>
                    <span className="mt-1.5 block text-[14px] leading-[1.45] text-[var(--ink-muted)]">{g.note}</span>
                  </span>
                  <ArrowRight className="gate-arrow size-5 shrink-0 text-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[14px] text-[var(--ink-muted)]">
            Or browse by place and grade:{' '}
            <Link href="/locations/houston" className="text-foreground underline">Houston</Link>,{' '}
            <Link href="/locations/texas" className="text-foreground underline">Texas</Link>,{' '}
            <Link href="/locations/remote" className="text-foreground underline">remote programs</Link>,{' '}
            <Link href="/opportunities-for-9th-graders" className="text-foreground underline">9th</Link>–
            <Link href="/opportunities-for-12th-graders" className="text-foreground underline">12th graders</Link>, or read the{' '}
            <Link href="/guides" className="text-foreground underline">student guides</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}

const INSPIRATION: Array<{ tag: string; title: string; body: string }> = [
  {
    tag: 'Why it exists',
    title: 'I wanted this to exist, so I built it.',
    body: 'I kept looking for a single place to find real STEM opportunities and there was not one worth trusting. So I made the one I actually wanted to use.',
  },
  {
    tag: 'What is different',
    title: 'Verified and structured, not crowdsourced.',
    body: 'Most lists are stale, with dead links and invented deadlines. Every record here is read from its official source and kept in one consistent shape, so listings can be compared side by side.',
  },
  {
    tag: 'How it works',
    title: 'Research first, then store it.',
    body: 'A pipeline reads each program page ahead of time and stores a structured record. A search retrieves verified records instantly instead of asking a model to invent an answer.',
  },
];

/** The notice pinned beside the board: who made this and why. */
export function Inspiration() {
  return (
    <section className="border-t border-[var(--hall-line-strong)] px-4 py-20 sm:px-6 sm:py-28" aria-labelledby="notice-heading">
      <div className="mx-auto w-full max-w-[var(--page-width)]">
        <h2 id="notice-heading" className="font-display max-w-[18ch] text-[34px] font-[900] leading-[0.94] tracking-[-0.02em] text-foreground sm:text-[56px] lg:text-[68px]">
          “I wanted this to exist, so I built it.”
        </h2>
        <p className="mt-6 max-w-[44ch] text-[17px] leading-[1.5] text-[var(--ink-soft)] sm:text-[19px]">
          NextStep Database is one student's answer to a real problem. No partners, no sponsors, no accounts. Just the records.
        </p>
      </div>
      <div className="mx-auto mt-14 grid w-full max-w-[var(--page-width)] grid-cols-1 gap-x-12 border-t border-[var(--hall-line-strong)] md:grid-cols-3">
        {INSPIRATION.map((row) => (
          <div key={row.tag} className="border-b border-border py-8 md:border-b-0 md:pr-6">
            <h3 className="font-display text-[22px] font-[900] leading-[1] tracking-[-0.015em] text-foreground sm:text-[26px]">{row.title}</h3>
            <p className="mt-3 text-[15px] leading-[1.6] text-[var(--ink-muted)]">{row.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Closing call to action: one line, one slab, one honest footnote. */
export function CtaBand() {
  return (
    <section className="band-deep border-t border-[var(--hall-line-strong)] px-4 py-24 sm:px-6 sm:py-36">
      <div className="mx-auto w-full max-w-[var(--page-width)]">
        <h2 className="font-display max-w-[12ch] text-[40px] font-[900] leading-[0.92] tracking-[-0.02em] text-foreground sm:text-[72px] lg:text-[92px]">
          Your grade. Your interests. <span className="plate">Your board.</span>
        </h2>
        <div className="mt-10 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
          <Link href="/find" className="btn-slab press text-[18px] !px-8 !py-4">
            Find your matches
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
          <p className="font-board text-[14px] font-bold tracking-[0.12em] text-[var(--ink-muted)]">No sign-in · Nothing saved · About two minutes</p>
        </div>
      </div>
    </section>
  );
}

const FOOTER_COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: 'Opportunities',
    links: [
      { label: 'Summer internships', href: '/summer-internships' },
      { label: 'Research programs', href: '/research-programs' },
      { label: 'Coding opportunities', href: '/computer-science-opportunities' },
      { label: 'Engineering opportunities', href: '/engineering-opportunities' },
      { label: 'Medical opportunities', href: '/medical-opportunities' },
      { label: 'Science competitions', href: '/science-competitions' },
    ],
  },
  {
    heading: 'Browse',
    links: [
      { label: 'Houston opportunities', href: '/locations/houston' },
      { label: 'Texas opportunities', href: '/locations/texas' },
      { label: 'Remote programs', href: '/locations/remote' },
      { label: 'Paid internships', href: '/paid-internships' },
      { label: 'Free summer programs', href: '/free-summer-programs' },
      { label: 'Full database', href: '/database' },
    ],
  },
  {
    heading: 'NextStep Database',
    links: [
      { label: 'How records are made', href: '/how' },
      { label: 'Vs. a chatbot', href: '/different' },
      { label: 'Student guides', href: '/guides' },
      { label: 'Find your matches', href: '/find' },
      { label: 'Student pathways', href: '/student-pathways' },
    ],
  },
];

/** Site-wide footer: the signage index at the end of the hall. */
export function HomeFooter() {
  return (
    <footer className="border-t border-border bg-[var(--hall-deep)] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto grid w-full max-w-[var(--page-width)] grid-cols-1 gap-10 sm:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="font-display inline-block text-[28px] font-[900] leading-[0.95] tracking-[-0.02em] text-foreground">
            NextStep Database
          </Link>
          <p className="mt-3 max-w-[30ch] text-[13px] leading-[1.55] text-[var(--ink-muted)]">
            Researched STEM opportunities for grades 6–12, sorted by what closes next.
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <p className="font-board text-[12px] font-bold tracking-[0.14em] text-[var(--ink-faint)]">{column.heading}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[13.5px] text-[var(--ink-soft)] transition-colors hover:text-foreground hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto mt-10 flex w-full max-w-[var(--page-width)] flex-col gap-3 border-t border-[var(--hall-line-strong)] pt-6 text-[12.5px] text-[var(--ink-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p className="tnum">&copy; {new Date().getFullYear()} NextStep Database · No sign-in required · This session is not saved.</p>
        <div className="flex gap-5">
          <Link href="/docs" className="transition-colors hover:text-foreground hover:underline">Documentation</Link>
          <a href="/admin/login" className="transition-colors hover:text-foreground hover:underline">Admin</a>
        </div>
      </div>
    </footer>
  );
}
