import Link from 'next/link';

export default function LandingFooter() {
  return <footer className="clarity-footer"><div className="clarity-footer-top"><p>Data access for the part you need.</p><nav aria-label="Footer"><Link href="/catalog">Marketplace</Link><Link href="#range-access">Range access</Link><Link href="#publish">Publish</Link><Link href="/mechanism">Mechanism</Link></nav></div><div className="clarity-footer-meta"><span>Built on Shelby Protocol</span><span>© Meris</span></div><div className="clarity-wordmark" aria-hidden="true">Meris</div></footer>;
}
