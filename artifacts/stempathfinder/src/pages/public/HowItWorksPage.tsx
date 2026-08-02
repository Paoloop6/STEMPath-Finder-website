import { HowItWorks, DatabaseProof, CtaBand } from '@/components/home/HomeSections';

/** Dedicated "How it works" page — the research-first architecture, explained. */
function HowItWorksPage() {
  return (
    <>
      <div className="pt-10" />
      <HowItWorks />
      <DatabaseProof />
      <CtaBand />
    </>
  );
}

export default HowItWorksPage;
