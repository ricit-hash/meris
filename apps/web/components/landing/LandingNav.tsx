import Link from 'next/link';
import GateLink from '../shared/GateLink';

const links = [
  { href: '/catalog', label: 'Marketplace' },
  { href: '/mechanism', label: 'Docs' },
  { href: '#technology', label: 'Technology' },
] as const;

export default function LandingNav() {
  return (
    <header className="clarity-nav">
      <Link href="/" aria-label="Meris home" className="clarity-logo">Meris</Link>
      <nav aria-label="Primary navigation" className="hidden rounded-full bg-[#1d1d1d] md:flex">
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
      <GateLink href="/gate?intent=app&next=/marketplace" className="clarity-login">Go to app</GateLink>
    </header>
  );
}
