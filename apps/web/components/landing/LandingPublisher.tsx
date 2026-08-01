import GateLink from '../shared/GateLink';

export default function LandingPublisher() {
  return (
    <section id="publish" className="clarity-publisher clarity-section [view-transition-name:publisher-gate]" aria-labelledby="publisher-title">
      <div className="clarity-publisher-copy"><p>PUBLISHER PATH</p><h2 id="publisher-title">Publish once.<span>Price the range.</span><span>Stay in control.</span></h2><div>Upload the dataset to Shelby, publish its terms, and let buyers request the part they need. Edit, delist, set expiry, and withdraw explicitly.</div><GateLink href="/gate" className="clarity-action clarity-action-primary">Publish a dataset</GateLink></div>
      <ol className="clarity-publisher-state" aria-label="Publisher listing states"><li><span>01</span><strong>Dataset uploaded</strong></li><li><span>02</span><strong>Listing terms published</strong></li><li><span>03</span><strong>Range access available</strong><i aria-hidden="true" /></li></ol>
    </section>
  );
}
