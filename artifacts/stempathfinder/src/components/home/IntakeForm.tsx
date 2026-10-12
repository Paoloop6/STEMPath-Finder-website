import { useState } from 'react';
import { MESSAGE_MAX_LENGTH, type StudentProfile } from '@/lib/ask-stempath';
import {
  SEARCH_TIERS,
  SEARCH_TIER_HINTS,
  SEARCH_TIER_LABELS,
  type SearchTier,
} from '@/lib/search-tier';

const EXAMPLE_PROMPTS = [
  'Biomedical internships for an 11th grader in Houston',
  'Beginner robotics camps',
  'Programs related to computer science majors',
  'Which opportunities are still accepting applications?',
];

/**
 * Fast, optional student intake. Expands inline beneath the question composer —
 * no page nav, no modal, no wizard. Every field is optional; blank means
 * "unknown", never a default. The typed StudentProfile is lifted to the parent
 * on every change; final empty-stripping happens in askStempath (pruneEmpty).
 */

const GRADES = ['6', '7', '8', '9', '10', '11', '12', 'College', 'Other'];
const GPA_SCALES: Array<[string, string]> = [
  ['4.0', '4.0 scale'],
  ['5.0', '5.0 scale'],
  ['100', '100-point'],
];
const RADII = [
  'Local only',
  'Within 25 miles',
  'Within 50 miles',
  'Within 100 miles',
  'Anywhere in the state',
  'No preference',
];
const FORMATS = ['In person', 'Virtual', 'Hybrid', 'Any'];
const INTERESTS = [
  'Computer science',
  'Artificial intelligence',
  'Robotics',
  'Engineering',
  'Biology',
  'Biomedical science',
  'Medicine and health',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Data science',
  'Environmental science',
  'Aerospace',
  'Other',
];
const TYPES = [
  'Internship',
  'Research',
  'Camp',
  'Competition',
  'Volunteer opportunity',
  'Mentorship',
  'Workshop',
  'Any',
];
const EXPERIENCE = ['Exploring / beginner', 'Some experience', 'Experienced', 'No preference'];
const TIMING = ['Summer', 'School year', 'Weekends', 'After school', 'Specific dates', 'No preference'];
const COST = ['Free only', 'Under $250', 'Under $500', 'Under $1,000', 'Scholarships acceptable', 'No preference'];
const APP_STATUS = ['Open applications only', 'Open and upcoming', 'Show all relevant programs'];

interface Draft {
  grade: string;
  gpaText: string;
  gpaScale: string;
  cityOrZip: string;
  radius: string;
  formats: string[];
  interests: string[];
  specificInterest: string;
  opportunityTypes: string[];
  experienceLevel: string;
  experienceDetails: string;
  availability: string[];
  specificDates: string;
  costPreference: string;
  applicationStatusPreference: string;
}

const EMPTY_DRAFT: Draft = {
  grade: '',
  gpaText: '',
  gpaScale: '',
  cityOrZip: '',
  radius: '',
  formats: [],
  interests: [],
  specificInterest: '',
  opportunityTypes: [],
  experienceLevel: '',
  experienceDetails: '',
  availability: [],
  specificDates: '',
  costPreference: '',
  applicationStatusPreference: '',
};

function buildProfile(d: Draft): StudentProfile {
  const p: StudentProfile = {};
  if (d.grade) p.grade = d.grade;

  const gpaValue = Number.parseFloat(d.gpaText);
  if (d.gpaText.trim() && Number.isFinite(gpaValue)) {
    p.gpa = { value: gpaValue, ...(d.gpaScale ? { scale: d.gpaScale as '4.0' | '5.0' | '100' } : {}) };
  }

  if (d.cityOrZip.trim() || d.radius) {
    p.location = {
      ...(d.cityOrZip.trim() ? { cityOrZip: d.cityOrZip.trim() } : {}),
      ...(d.radius ? { radius: d.radius } : {}),
    };
  }

  if (d.formats.length) p.formats = d.formats;
  if (d.interests.length) p.interests = d.interests;
  if (d.specificInterest.trim()) p.specificInterest = d.specificInterest.trim();
  if (d.opportunityTypes.length) p.opportunityTypes = d.opportunityTypes;
  if (d.experienceLevel) p.experienceLevel = d.experienceLevel;
  if (d.experienceDetails.trim()) p.experienceDetails = d.experienceDetails.trim();
  if (d.availability.length) p.availability = d.availability;
  if (d.specificDates.trim()) p.specificDates = d.specificDates.trim();
  if (d.costPreference) p.costPreference = d.costPreference;
  if (d.applicationStatusPreference) p.applicationStatusPreference = d.applicationStatusPreference;

  return p;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-annotation mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  );
}

const chipBase =
  'rounded-[8px] border px-2.5 py-1.5 text-[12px] leading-none transition-colors disabled:opacity-40';
const chipOff = 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground';
const chipOn = 'border-primary/60 bg-primary/10 text-primary';

function SingleChips({
  options,
  value,
  onChange,
  allowClear = true,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  /** Profile fields clear back to "unknown"; a required choice like tier cannot. */
  allowClear?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = value === opt;
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on && allowClear ? '' : opt)}
            className={`${chipBase} ${on ? chipOn : chipOff}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function MultiChips({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(opt)}
            className={`${chipBase} ${on ? chipOn : chipOff}`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

const inputBase =
  'w-full rounded-[8px] border border-border bg-[var(--brand-bg)] px-3 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50';

interface IntakeFormProps {
  question: string;
  onQuestionChange: (value: string) => void;
  onChange: (profile: StudentProfile) => void;
  onSubmit: () => void;
  isLoading: boolean;
  /** Search depth is a per-run setting, not a profile field — it is lifted separately. */
  tier: SearchTier;
  onTierChange: (tier: SearchTier) => void;
}

const TIER_BY_LABEL = new Map<string, SearchTier>(
  SEARCH_TIERS.map((t) => [SEARCH_TIER_LABELS[t], t]),
);

export function IntakeForm({
  question,
  onQuestionChange,
  onChange,
  onSubmit,
  isLoading,
  tier,
  onTierChange,
}: IntakeFormProps) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function patch(next: Partial<Draft>) {
    const merged = { ...draft, ...next };
    setDraft(merged);
    onChange(buildProfile(merged));
  }

  return (
    <div className="relative rounded-[12px] border border-border bg-card p-4 shadow-[0_1px_0_rgba(20,21,22,0.04),0_14px_28px_-20px_rgba(20,21,22,0.5)] sm:p-5">
      <div className="flex flex-col gap-4">
        {/* Optional free-text question — still powers the AI search, now secondary. */}
        <div>
          <FieldLabel>Ask in your own words, if you like</FieldLabel>
          <textarea
            value={question}
            onChange={(e) => onQuestionChange(e.target.value.slice(0, MESSAGE_MAX_LENGTH))}
            placeholder="e.g. I'm an 11th grader in Houston looking for biomedical research experience this summer…"
            aria-label="Ask in your own words"
            rows={2}
            className={`${inputBase} min-h-[58px] resize-none`}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onQuestionChange(prompt)}
                className={`${chipBase} ${chipOff}`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Row 1: Grade | GPA | Location */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel>Grade</FieldLabel>
            <SingleChips options={GRADES} value={draft.grade} onChange={(v) => patch({ grade: v })} />
          </div>
          <div>
            <FieldLabel>GPA, if relevant</FieldLabel>
            <div className="flex gap-1.5">
              <input
                type="text"
                inputMode="decimal"
                placeholder="3.7"
                aria-label="GPA"
                value={draft.gpaText}
                onChange={(e) => patch({ gpaText: e.target.value.replace(/[^0-9.]/g, '').slice(0, 5) })}
                className={`${inputBase} w-20 shrink-0`}
              />
              <select
                aria-label="GPA scale"
                value={draft.gpaScale}
                onChange={(e) => patch({ gpaScale: e.target.value })}
                className={inputBase}
              >
                <option value="">Scale…</option>
                {GPA_SCALES.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <FieldLabel>Location</FieldLabel>
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                placeholder="City or ZIP code"
                aria-label="City or ZIP code"
                value={draft.cityOrZip}
                onChange={(e) => patch({ cityOrZip: e.target.value.slice(0, 60) })}
                className={inputBase}
              />
              <select
                aria-label="Preferred radius"
                value={draft.radius}
                onChange={(e) => patch({ radius: e.target.value })}
                className={inputBase}
              >
                <option value="">Preferred radius…</option>
                {RADII.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Interests (full width) */}
        <div>
          <FieldLabel>Interests</FieldLabel>
          <MultiChips options={INTERESTS} value={draft.interests} onChange={(v) => patch({ interests: v })} />
          <input
            type="text"
            placeholder="Anything more specific? e.g. cancer biology, medical devices, or machine learning"
            aria-label="Anything more specific?"
            value={draft.specificInterest}
            onChange={(e) => patch({ specificInterest: e.target.value.slice(0, 200) })}
            className={`${inputBase} mt-2`}
          />
        </div>

        {/* Row 3: Opportunity type | Experience level */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Opportunity type</FieldLabel>
            <MultiChips
              options={TYPES}
              value={draft.opportunityTypes}
              onChange={(v) => patch({ opportunityTypes: v })}
            />
          </div>
          <div>
            <FieldLabel>Experience level</FieldLabel>
            <SingleChips
              options={EXPERIENCE}
              value={draft.experienceLevel}
              onChange={(v) => patch({ experienceLevel: v })}
            />
            <input
              type="text"
              placeholder="Relevant classes, projects, clubs, or experience"
              aria-label="Relevant classes, projects, clubs, or experience"
              value={draft.experienceDetails}
              onChange={(e) => patch({ experienceDetails: e.target.value.slice(0, 300) })}
              className={`${inputBase} mt-2`}
            />
          </div>
        </div>

        {/* Row 4: Format | Timing | Cost */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel>Program format</FieldLabel>
            <SingleChips options={FORMATS} value={draft.formats[0] ?? ''} onChange={(v) => patch({ formats: v ? [v] : [] })} />
          </div>
          <div>
            <FieldLabel>Timing</FieldLabel>
            <MultiChips options={TIMING} value={draft.availability} onChange={(v) => patch({ availability: v })} />
            {draft.availability.includes('Specific dates') && (
              <input
                type="text"
                placeholder="Which dates? e.g. June–August 2026"
                aria-label="Specific dates"
                value={draft.specificDates}
                onChange={(e) => patch({ specificDates: e.target.value.slice(0, 120) })}
                className={`${inputBase} mt-2`}
              />
            )}
          </div>
          <div>
            <FieldLabel>Cost</FieldLabel>
            <SingleChips options={COST} value={draft.costPreference} onChange={(v) => patch({ costPreference: v })} />
          </div>
        </div>

        {/* Row 5: Application status | Search depth */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Application status</FieldLabel>
            <SingleChips
              options={APP_STATUS}
              value={draft.applicationStatusPreference}
              onChange={(v) => patch({ applicationStatusPreference: v })}
            />
          </div>
          <div>
            <FieldLabel>Search depth</FieldLabel>
            <SingleChips
              options={SEARCH_TIERS.map((t) => SEARCH_TIER_LABELS[t])}
              value={SEARCH_TIER_LABELS[tier]}
              onChange={(label) => {
                const next = TIER_BY_LABEL.get(label);
                if (next) onTierChange(next);
              }}
              allowClear={false}
            />
            <p className="font-annotation mt-1.5 text-[11px] text-muted-foreground">
              {SEARCH_TIER_HINTS[tier]}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="font-annotation text-[11px] text-muted-foreground">
            Everything here is optional — blank just means we don&apos;t assume.
          </p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading}
            className="h-[38px] shrink-0 rounded-[var(--radius-button)] bg-primary px-[18px] text-[13px] font-bold tracking-[-0.01em] text-primary-foreground transition-transform duration-[var(--motion-base)] hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? 'Finding your matches…' : 'Find my matches'}
          </button>
        </div>
      </div>
    </div>
  );
}
