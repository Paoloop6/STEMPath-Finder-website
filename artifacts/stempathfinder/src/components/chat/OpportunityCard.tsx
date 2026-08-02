import { AlertTriangle, BadgeCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OpportunityMatch } from '@/lib/ask-stempath';

const STATUS_STYLES: Record<string, string> = {
  open: 'text-[var(--brand-accent)] bg-[var(--brand-accent)]/10',
  upcoming: 'text-[var(--brand-warning)] bg-[var(--brand-warning)]/10',
  closed: 'text-[var(--brand-error)] bg-[var(--brand-error)]/10',
};
const DEFAULT_STATUS_STYLE = 'text-muted-foreground bg-muted';

function formatList(values: string[] | string | null | undefined, max = 3): string {
  if (!values) return 'Not specified';
  const arr = Array.isArray(values) ? values : [values];
  if (arr.length === 0) return 'Not specified';
  if (arr.length <= max) return arr.join(', ');
  return `${arr.slice(0, max).join(', ')} +${arr.length - max} more`;
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function OpportunityCard({ match }: { match: OpportunityMatch }) {
  const statusStyle = match.application_status
    ? STATUS_STYLES[match.application_status] ?? DEFAULT_STATUS_STYLE
    : DEFAULT_STATUS_STYLE;
  const deadline = formatDate(match.deadline);
  const stemFields = Array.isArray(match.stem_fields) ? match.stem_fields : [];
  const majors = Array.isArray(match.college_major_matches) ? match.college_major_matches : [];

  return (
    <div className="flex flex-col rounded-[var(--radius-card)] border border-border bg-card p-4 transition-transform duration-[var(--motion-base)] hover:-translate-y-[2px]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-foreground">
          {match.title ?? 'Untitled opportunity'}
        </h3>
        {match.application_status && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusStyle}`}>
            {match.application_status}
          </span>
        )}
      </div>
      {match.organization && (
        <p className="mt-0.5 text-xs text-muted-foreground">{match.organization}</p>
      )}

      {(match.opportunity_type || stemFields.length > 0) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {match.opportunity_type && (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
              {match.opportunity_type}
            </span>
          )}
          {stemFields.slice(0, 3).map((field) => (
            <span
              key={field}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
            >
              {field}
            </span>
          ))}
          {stemFields.length > 3 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              +{stemFields.length - 3} more
            </span>
          )}
        </div>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <div>
          <dt className="font-medium text-foreground/70">Grades</dt>
          <dd>{formatList(match.eligible_grades)}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/70">Location</dt>
          <dd>{match.location || 'Not specified'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/70">Cost</dt>
          <dd>{match.cost || 'Not specified'}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground/70">Deadline</dt>
          <dd>{deadline || 'Not specified'}</dd>
        </div>
      </dl>

      {majors.length > 0 && (
        <p className="mt-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Related majors (subject fit, not a ranking): </span>
          {formatList(majors, 4)}
        </p>
      )}

      {match.match_reason && (
        <p className="mt-2.5 text-xs text-foreground/85">
          <span className="font-medium text-foreground">Why it matches: </span>
          {match.match_reason}
        </p>
      )}

      {match.eligibility_warning && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-[var(--radius-control)] bg-[var(--brand-warning)]/10 px-2.5 py-1.5 text-xs text-[var(--brand-warning)]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {match.eligibility_warning}
        </div>
      )}

      {match.verified_at && (
        <div className="mt-2.5 flex items-center gap-1 text-[11px] text-primary">
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          Verified source · {formatDate(match.verified_at)}
        </div>
      )}

      <div className="mt-3.5 flex gap-2">
        {match.official_url && (
          <Button asChild size="sm" variant="outline" className="flex-1 rounded-[var(--radius-button)]">
            <a href={match.official_url} target="_blank" rel="noreferrer noopener">
              Official website
              <ExternalLink className="ml-1 size-3" />
            </a>
          </Button>
        )}
        {match.application_url && (
          <Button asChild size="sm" className="flex-1 rounded-[var(--radius-button)] border-0">
            <a href={match.application_url} target="_blank" rel="noreferrer noopener">
              Apply
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
