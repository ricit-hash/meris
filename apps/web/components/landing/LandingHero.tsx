import Link from 'next/link';
import GateLink from '../shared/GateLink';

export default function LandingHero() {
  return (
    <section id="hero" className="clarity-hero" aria-labelledby="landing-title">
      <svg aria-hidden="true" className="clarity-orbit" viewBox="0 0 400 340" fill="none">
        <g stroke="currentColor" strokeLinecap="round" strokeWidth="7" opacity="0.7" transform="translate(20 17) scale(0.9)">
          <ellipse cx="200" cy="170" rx="105" ry="165" transform="rotate(-20 200 170)" />
          <ellipse cx="200" cy="170" rx="190" ry="55" transform="rotate(-8 200 170)" />
          <ellipse cx="200" cy="170" rx="155" ry="42" transform="rotate(24 200 170)" />
        </g>
      </svg>
      <div className="clarity-hero-copy">
        <h1 id="landing-title">Large datasets.<span>Expensive downloads.</span><span>Request only what you need.</span></h1>
        <p>Meris lets buyers inspect AI and Web3 datasets, choose a useful range, and pay for that range. Publishers keep the source data and listing terms under their control.</p>
        <div className="clarity-actions">
          <Link href="/catalog" className="clarity-action clarity-action-primary">Explore datasets</Link>
          <GateLink href="/gate?intent=publish&next=/publish" className="clarity-action clarity-action-secondary">Publish a dataset</GateLink>
        </div>
      </div>
    </section>
  );
}
