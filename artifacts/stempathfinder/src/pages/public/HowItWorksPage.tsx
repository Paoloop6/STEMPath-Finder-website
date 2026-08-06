import { HowItWorks, DatabaseProof, CtaBand } from '@/components/home/HomeSections';
import { Seo } from '@/components/Seo';

/** Dedicated "How it works" page — the research-first architecture, explained. */
function HowItWorksPage() {
  return (
    <>
      <Seo
        title="How STEMPath Finder Works"
        description="How STEMPath Finder researches STEM opportunities for high school students from official sources before you search — and why that beats generated answers."
        path="/how"
      />
      <div className="pt-10" />
      <HowItWorks />
      <DatabaseProof />
      <CtaBand />
    </>
  );
}

export default HowItWorksPage;
