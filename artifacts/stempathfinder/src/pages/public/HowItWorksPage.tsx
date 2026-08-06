import { HowItWorks, DatabaseProof, CtaBand } from '@/components/home/HomeSections';
import { Seo } from '@/components/Seo';
import { HOW_IT_WORKS_H1, HOW_IT_WORKS_INTRO } from '@/lib/static-pages';

/** Dedicated "How it works" page — the research-first architecture, explained. */
function HowItWorksPage() {
  return (
    <>
      <Seo
        title="How NextStep Database Works"
        description="How NextStep Database researches STEM opportunities for students from official sources before you search — what we record, and what you should always confirm yourself."
        path="/how"
      />
      <section className="mx-auto w-full max-w-[var(--page-width)] px-4 pt-12 sm:px-6 sm:pt-16">
        <h1 className="font-display max-w-[760px] text-[32px] font-[660] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[44px]">
          {HOW_IT_WORKS_H1}
        </h1>
        {HOW_IT_WORKS_INTRO.map((paragraph, i) => (
          <p
            key={i}
            className="mt-4 max-w-[680px] text-[16px] leading-[1.7] text-[var(--brand-muted-1)]"
          >
            {paragraph}
          </p>
        ))}
      </section>
      <HowItWorks />
      <DatabaseProof />
      <CtaBand />
    </>
  );
}

export default HowItWorksPage;
