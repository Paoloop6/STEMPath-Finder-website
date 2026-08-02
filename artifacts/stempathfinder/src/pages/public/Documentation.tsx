import { FileText } from 'lucide-react';

/**
 * Documentation page. Placeholder until the final PDF is ready.
 * TO PUBLISH: drop the file at `public/documentation.pdf` and set
 * PDF_URL below to "/documentation.pdf" — the embed will render it.
 */
const PDF_URL: string | null = null;

function Documentation() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto w-full max-w-[var(--story-width)]">
          <span className="font-annotation text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Documentation
          </span>
          <h1 className="font-display mt-3 text-[32px] font-[660] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[46px]">
            The full project write-up.
          </h1>
          <p className="mt-4 max-w-[620px] text-[16px] leading-[1.6] text-[var(--brand-muted-1)]">
            The complete documentation for STEMPath Finder will be published here as a PDF once the
            project is finished.
          </p>

          <div className="mt-10">
            {PDF_URL ? (
              <div className="overflow-hidden rounded-[var(--radius-large)] border border-border">
                <iframe src={PDF_URL} title="STEMPath Finder documentation" className="h-[80vh] w-full" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-large)] border border-dashed border-border bg-[var(--surface-subtle)] px-6 py-24 text-center">
                <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
                <p className="font-display text-[18px] font-semibold text-foreground">Documentation coming soon</p>
                <p className="max-w-[420px] text-[14px] text-muted-foreground">
                  This is a placeholder. The final documentation PDF will appear here when it&apos;s ready.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
  );
}

export default Documentation;
