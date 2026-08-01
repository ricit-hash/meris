import Link from 'next/link';

const fields = [['FORMAT', 'CSV'], ['RECORDS', '250,000'], ['LICENSE', 'ODbL'], ['PUBLISHER', '0x12…cdef'], ['SELECTED RANGE', '256 KB'], ['PRICE', '0.50 sUSD']] as const;

export default function LandingManifest() {
  return (
    <section id="manifest" className="clarity-manifest clarity-section" aria-labelledby="manifest-title">
      <header className="clarity-heading clarity-heading-light"><p>MARKET MANIFEST</p><h2 id="manifest-title">Inspect before you pay.</h2><span>Compare the listing terms before you request bytes. The manifest remains visible in the marketplace while the dataset stays on Shelby.</span><Link href="/catalog">Open the marketplace <b aria-hidden="true">↗</b></Link></header>
      <article className="clarity-manifest-sheet">
        <div><span>DATASET</span><h3>Agent Trace Corpus</h3><p>Structured traces from planning and execution agents.</p></div>
        <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </article>
    </section>
  );
}
