import { Difference, CtaBand } from '@/components/home/HomeSections';
import { Seo } from '@/components/Seo';

/** "How we're different from ChatGPT" page. */
function DifferencePage() {
  return (
    <>
      <Seo
        title="STEMPath Finder vs. a General Chatbot"
        description="Why a researched database of verified STEM opportunities beats a chatbot's generated answers — no invented programs, deadlines, or links."
        path="/different"
      />
      <div className="pt-10" />
      <Difference />
      <CtaBand />
    </>
  );
}

export default DifferencePage;
