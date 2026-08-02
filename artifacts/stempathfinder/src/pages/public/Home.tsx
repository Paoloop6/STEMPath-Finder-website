import { HomeHero, Inspiration, CtaBand } from '@/components/home/HomeSections';

/** Public landing page: hero + the personal inspiration story only.
 * How it works / database / evolution each live on their own page. */
function Home() {
  return (
    <>
      <HomeHero />
      <Inspiration />
      <CtaBand />
    </>
  );
}

export default Home;
