import { CtaBand, HomeHero, Inspiration, WhatYouCanFind } from '@/components/home/HomeSections';
import { homeJsonLd, Seo } from '@/components/Seo';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE } from '@/lib/seo';

/** Public landing page: hero, what you can find (crawlable category links),
 * the personal inspiration story, and the closing CTA. */
function Home() {
  return (
    <>
      <Seo
        title={DEFAULT_TITLE}
        description={DEFAULT_DESCRIPTION}
        path="/"
        jsonLd={homeJsonLd()}
      />
      <HomeHero />
      <WhatYouCanFind />
      <Inspiration />
      <CtaBand />
    </>
  );
}

export default Home;
