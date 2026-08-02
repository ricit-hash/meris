'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type PublicManifest = {
  id: string;
  name: string;
  description: string;
  format: string;
  records: number;
  license: string;
  publisher: string;
  fileSize: string;
  priceShelbyUSD: number;
};

const fallback: PublicManifest = {
  id: '',
  name: 'Agent Trace Corpus',
  description: 'Structured traces from planning and execution agents.',
  format: 'CSV',
  records: 250000,
  license: 'ODbL',
  publisher: '0x12…cdef',
  fileSize: '256 KB',
  priceShelbyUSD: 0.5,
};

export default function LandingManifest() {
  const [manifest, setManifest] = useState<PublicManifest>(fallback);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/manifests')
      .then((res) => res.ok ? res.json() as Promise<{ manifests?: PublicManifest[] }> : null)
      .then((data) => {
        const first = data?.manifests?.[0];
        if (!cancelled && first) setManifest(first);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const fields = [
    ['FORMAT', manifest.format],
    ['RECORDS', manifest.records.toLocaleString()],
    ['LICENSE', manifest.license],
    ['PUBLISHER', manifest.publisher],
    ['FILE SIZE', manifest.fileSize],
    ['PRICE', manifest.priceShelbyUSD === 0 ? 'Free' : `${manifest.priceShelbyUSD.toFixed(2)} sUSD`],
  ] as const;

  return (
    <section id="manifest" className="clarity-manifest clarity-section" aria-labelledby="manifest-title">
      <header className="clarity-heading clarity-heading-light">
        <p>MARKET PREVIEW</p>
        <h2 id="manifest-title">Inspect before you pay.</h2>
        <span>Selected listings from the Meris marketplace. Browse the terms here; connect your wallet when you want to buy.</span>
        <Link href={manifest.id ? `/catalog/${manifest.id}` : '/catalog'}>View in the marketplace <b aria-hidden="true">↗</b></Link>
      </header>
      <article className="clarity-manifest-sheet">
        <div><span>DATASET</span><h3>{manifest.name}</h3><p>{manifest.description}</p></div>
        <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </article>
    </section>
  );
}
