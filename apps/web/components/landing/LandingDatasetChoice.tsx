function StorageMark() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 9.5 16 5l10 4.5-10 4.6L6 9.5Zm0 6.3 10 4.5 10-4.5M6 22l10 4.5L26 22" /></svg>;
}

export default function LandingDatasetChoice() {
  return (
    <section id="technology" className="clarity-choice clarity-section tech-capability" aria-labelledby="tech-title">
      <header className="clarity-heading">
        <p>MERIS TECHNOLOGY</p>
        <h2 id="tech-title">Technology built for range access.</h2>
        <span>Storage, pricing, payment, and delivery work around the selected records—not the complete archive.</span>
      </header>

      <div className="tech-capability-grid">
        <article className="tech-capability-card tech-card-blob">
          <div className="tech-card-top"><h3>Shelby blob storage</h3><StorageMark /></div>
          <div className="tech-blob-visual" aria-hidden="true"><span>BLOB</span><strong>2.4 GB</strong><i /></div>
          <p>The complete dataset stays under the publisher&apos;s account on Shelby.</p>
        </article>

        <article className="tech-capability-card tech-card-price">
          <div className="tech-card-top"><h3>Proportional range pricing</h3><span className="tech-percent">25%</span></div>
          <div className="tech-price-formula" aria-label="Twenty-five records times 0.12 sUSD equals 3 sUSD"><span>25 records</span><i>×</i><span>0.12</span><i>=</i><strong>3.00 sUSD</strong></div>
          <p>The quote scales with the records requested, with a 1 sUSD minimum.</p>
        </article>

        <article className="tech-capability-card tech-card-channel">
          <div className="tech-card-top"><h3>ShelbyUSD micropayment channels</h3><span className="tech-channel-status">FUNDED</span></div>
          <div className="tech-channel-visual" aria-hidden="true">
            <span>BUYER</span><i /><strong>25 RECORDS</strong><i /><span>PUBLISHER</span>
            <b>3.00 sUSD</b>
          </div>
          <p>The buyer funds a channel. Meris verifies its balance before authorizing delivery.</p>
        </article>

        <article className="tech-capability-card tech-card-delivery">
          <div><h3>Verified range delivery</h3><p>Only the paid record window is delivered. The complete Shelby blob stays in place.</p></div>
          <div className="tech-delivery-visual" aria-hidden="true">
            <span><b>FULL BLOB</b><i /></span>
            <span><b>SELECTED</b><i><em /></i></span>
            <strong><small>DELIVERED</small>records 1–25 <b>✓</b></strong>
          </div>
        </article>
      </div>
    </section>
  );
}
