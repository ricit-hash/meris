import LandingDatasetChoice from './LandingDatasetChoice';
import LandingFooter from './LandingFooter';
import LandingHero from './LandingHero';
import LandingManifest from './LandingManifest';
import LandingNav from './LandingNav';
import LandingPublisher from './LandingPublisher';
import LandingRangeAccess from './LandingRangeAccess';

export default function Landing() {
  return (
    <div className="clarity-landing">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingDatasetChoice />
        <div className="clarity-light-field">
          <LandingRangeAccess />
          <LandingManifest />
        </div>
        <LandingPublisher />
      </main>
      <LandingFooter />
    </div>
  );
}
