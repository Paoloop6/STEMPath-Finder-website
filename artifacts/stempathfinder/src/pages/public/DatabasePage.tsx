import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import {
  BROWSE_LIMIT,
  distinctStemFields,
  distinctValues,
  fetchDatabaseRecords,
  humanize,
  matchesQuery,
} from '@/lib/database-records';
import { OpportunityRow } from '@/components/OpportunityRow';
import { Seo } from '@/components/Seo';

const ANY = '';

const selectBase =
  'w-full rounded-[8px] border border-border bg-[var(--brand-bg)] px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-primary/50';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-annotation mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </span>
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
  format = humanize,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  format?: (v: string) => string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectBase}
      >
        <option value={ANY}>All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {format(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Public browse view of the researched database. Everything a student can search
 * for, listed plainly — the counterpart to /find, which narrows the same records
 * down to a personal shortlist.
 */
function DatabasePage() {
  // Live DynamoDB data via the server API; short staleTime keeps it fresh
  // without a rebuild, and Refresh busts the server cache on demand.
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['database-records'],
    queryFn: () => fetchDatabaseRecords(),
    staleTime: 30 * 1000,
  });
  const queryClient = useQueryClient();

  async function refreshNow() {
    const fresh = await fetchDatabaseRecords(true);
    queryClient.setQueryData(['database-records'], fresh);
  }

  const [query, setQuery] = useState('');
  const [type, setType] = useState(ANY);
  const [field, setField] = useState(ANY);
  const [status, setStatus] = useState(ANY);
  const [format, setFormat] = useState(ANY);

  const records = useMemo(() => data?.records ?? [], [data]);

  const options = useMemo(
    () => ({
      types: distinctValues(records, 'opportunity_type'),
      fields: distinctStemFields(records),
      statuses: distinctValues(records, 'application_status'),
      formats: distinctValues(records, 'program_format'),
    }),
    [records],
  );

  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          matchesQuery(r, query) &&
          (!type || r.opportunity_type === type) &&
          (!field || (Array.isArray(r.stem_fields) && r.stem_fields.includes(field))) &&
          (!status || r.application_status === status) &&
          (!format || r.program_format === format),
      ),
    [records, query, type, field, status, format],
  );

  const isFiltered = Boolean(query || type || field || status || format);

  function clearFilters() {
    setQuery('');
    setType(ANY);
    setField(ANY);
    setStatus(ANY);
    setFormat(ANY);
  }

  return (
    <section className="mx-auto w-full max-w-[var(--page-width)] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <Seo
        title="Browse the STEM Opportunity Database"
        description="Browse every researched STEM opportunity for high school students — internships, research programs, competitions, and camps with verified details and deadlines."
        path="/database"
      />
      <span className="font-annotation text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        The database
      </span>
      <h1 className="font-display mt-3 max-w-[760px] text-[32px] font-[660] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[44px]">
        Every opportunity we&apos;ve researched.
      </h1>
      <p className="mt-4 max-w-[620px] text-[16px] leading-[1.6] text-[var(--brand-muted-1)]">
        Browse the whole database directly. Each record was researched from its official source
        before you got here — nothing is generated when you search.{' '}
        <Link href="/find" className="text-primary underline-offset-4 hover:underline">
          Find your matches
        </Link>{' '}
        instead if you&apos;d rather it narrow things down for you.
      </p>

      <div className="mt-8 rounded-[12px] border border-border bg-[rgba(8,10,13,0.78)] p-4 backdrop-blur-sm sm:p-5">
        <div>
          <FieldLabel>Search</FieldLabel>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title, organization, city, or field…"
              aria-label="Search the database"
              className={`${selectBase} pl-9 placeholder:text-muted-foreground`}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Filter label="Opportunity type" value={type} options={options.types} onChange={setType} />
          <Filter
            label="STEM field"
            value={field}
            options={options.fields}
            onChange={setField}
            format={(v) => v}
          />
          <Filter label="Application status" value={status} options={options.statuses} onChange={setStatus} />
          <Filter label="Format" value={format} options={options.formats} onChange={setFormat} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="font-annotation text-[12px] text-muted-foreground">
          {isLoading
            ? 'Loading…'
            : `Showing ${filtered.length.toLocaleString()} of ${records.length.toLocaleString()} researched ${
                records.length === 1 ? 'opportunity' : 'opportunities'
              }`}
        </p>
        <div className="flex items-center gap-4">
          {import.meta.env.DEV && data && (
            <span className="font-annotation text-[11px] text-muted-foreground">
              Data source: AWS DynamoDB / {data.meta.table}
            </span>
          )}
          <button
            type="button"
            onClick={() => void refreshNow()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {isFiltered && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <SlidersHorizontal className="size-3.5" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {isError ? (
        <p className="mt-8 text-[14px] text-[var(--brand-error)]">
          {error instanceof Error ? error.message : 'Could not load the database.'}
        </p>
      ) : isLoading ? (
        <div className="mt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-border py-5">
              <div className="skeleton-shimmer h-5 w-2/5 rounded-md bg-white/10" />
              <div className="skeleton-shimmer mt-2 h-3 w-1/4 rounded-md bg-white/10" />
              <div className="skeleton-shimmer mt-3 h-3 w-3/5 rounded-md bg-white/10" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-[14px] text-[var(--brand-muted-1)]">
          Nothing matches those filters.{' '}
          <button
            type="button"
            onClick={clearFilters}
            className="text-primary underline-offset-4 hover:underline"
          >
            Clear them
          </button>{' '}
          to see everything.
        </p>
      ) : (
        <div className="mt-2">
          {filtered.map((record) => (
            <OpportunityRow key={record.id} record={record} />
          ))}
        </div>
      )}

      {records.length >= BROWSE_LIMIT && (
        <p className="mt-6 font-annotation text-[12px] text-muted-foreground">
          Showing the first {BROWSE_LIMIT.toLocaleString()} records.
        </p>
      )}
    </section>
  );
}

export default DatabasePage;
