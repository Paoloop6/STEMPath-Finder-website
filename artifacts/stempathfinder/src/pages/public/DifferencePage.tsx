import { Difference, CtaBand } from '@/components/home/HomeSections';
import { Seo } from '@/components/Seo';
import { DIFFERENCE_H1, DIFFERENCE_INTRO } from '@/lib/static-pages';

/** "How we're different from a general chatbot" page. */
function DifferencePage() {
  return (
    <>
      <Seo
        title="Researched Database vs. a General Chatbot"
        description="Why a researched database of STEM opportunities beats a chatbot's generated answers — no invented programs, deadlines, or links."
        path="/different"
      />
      <section className="mx-auto w-full max-w-[var(--page-width)] px-4 pt-12 sm:px-6 sm:pt-16">
        <h1 className="font-display max-w-[760px] text-[32px] font-[660] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[44px]">
          {DIFFERENCE_H1}
        </h1>
        {DIFFERENCE_INTRO.map((paragraph, i) => (
          <p
            key={i}
            className="mt-4 max-w-[680px] text-[16px] leading-[1.7] text-[var(--brand-muted-1)]"
          >
            {paragraph}
          </p>
        ))}
      </section>
      <Difference />
      <CtaBand />
    </>
  );
}

export default DifferencePage;
