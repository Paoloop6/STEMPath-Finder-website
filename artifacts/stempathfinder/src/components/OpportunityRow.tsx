import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, BadgeCheck } from "lucide-react";
import { gradeLabel, humanize, type DatabaseRecord } from "@/lib/database-records";
import { opportunityPath } from "@/lib/seo";

const STATUS_TONE: Record<string, string> = {
  open: "text-[var(--brand-success)] border-[var(--brand-success)]/40",
  upcoming: "text-[var(--brand-warning)] border-[var(--brand-warning)]/40",
  closed: "text-[var(--brand-error)] border-[var(--brand-error)]/40",
};

function metaLine(record: DatabaseRecord): string {
  const grades = gradeLabel(record.eligible_grades);
  return [
    humanize(record.opportunity_type),
    grades ? `Grades ${grades}` : "",
    record.location,
    record.cost,
    humanize(record.program_format),
    record.application_deadline ? `Deadline ${record.application_deadline}` : "",
  ]
    .filter(Boolean)
    .join("  ·  ");
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Permanent internal detail path for a browse record. */
export function recordPath(record: DatabaseRecord): string {
  return opportunityPath(record.title, record.numeric_id ?? record.id);
}

/**
 * One opportunity in a crawlable listing. The title links to the permanent
 * internal detail page; the official site stays one click away.
 */
export function OpportunityRow({ record }: { record: DatabaseRecord }) {
  const externalLink = record.official_url || record.application_url || undefined;
  const status = record.application_status;
  const tone = status ? STATUS_TONE[status] : undefined;
  const detailPath = recordPath(record);

  return (
    <div className="border-t border-border py-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-display text-[17px] font-semibold leading-snug text-foreground">
            <Link href={detailPath} className="hover:underline">
              {record.title ?? "Untitled opportunity"}
            </Link>
            {(record.review_status === "pending" || !record.published) && (
              <span className="ml-2 inline-flex translate-y-[-2px] items-center rounded-full border border-[var(--brand-warning)]/40 px-2 py-0.5 align-middle text-[10px] font-medium text-[var(--brand-warning)]">
                Pending review
              </span>
            )}
          </h3>
          {record.organization && (
            <p className="mt-0.5 text-[13px] text-muted-foreground">{record.organization}</p>
          )}
        </div>
        {status && status !== "unknown" && (
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${
              tone ?? "border-border text-muted-foreground"
            }`}
          >
            {status}
          </span>
        )}
      </div>

      <p className="mt-2.5 font-annotation text-[12px] text-[var(--brand-muted-3)]">{metaLine(record)}</p>

      {Array.isArray(record.stem_fields) && record.stem_fields.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {record.stem_fields.map((field) => (
            <span
              key={field}
              className="rounded-[6px] border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {field}
            </span>
          ))}
        </div>
      )}

      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5 text-[var(--brand-success)]">
          <BadgeCheck className="size-3.5" /> Researched from its official source
        </span>
        {record.discovered_at && <span>Discovered {shortDate(record.discovered_at)}</span>}
        {record.last_verified_at && record.last_verified_at !== record.discovered_at && (
          <span>Content updated {shortDate(record.last_verified_at)}</span>
        )}
        {record.checked_at && <span>Last checked {shortDate(record.checked_at)}</span>}
      </p>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
        <Link
          href={detailPath}
          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
        >
          View details <ArrowRight className="size-3.5" />
        </Link>
        {externalLink && (
          <a
            href={externalLink}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Official site <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </p>
    </div>
  );
}
